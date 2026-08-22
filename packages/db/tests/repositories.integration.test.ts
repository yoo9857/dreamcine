import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { AppError } from '@aidream/core'
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const originalDatabaseUrl = process.env.DATABASE_URL
const originalAuthSecret = process.env.AUTH_SECRET

let container: StartedPostgreSqlContainer
let database: typeof import('../src/client.js').db
let repo: typeof import('../src/index.js')

function expectCode(error: unknown, code: AppError['code']): void {
  expect(error).toBeInstanceOf(AppError)
  if (!(error instanceof AppError)) {
    throw error
  }
  expect(error.code).toBe(code)
}

async function createFixtureUser(suffix: string): Promise<string> {
  const user = await repo.createUser({
    handle: `user_${suffix}`,
    email: `user_${suffix}@example.com`,
    displayName: `User ${suffix}`,
  })
  return user.id
}

async function createFixtureSeries(
  ownerId: string,
  suffix: string,
): Promise<string> {
  const series = await repo.createSeries({
    ownerId,
    slug: `series-${suffix}`,
    title: `Series ${suffix}`,
  })
  return series.id
}

beforeAll(async () => {
  const fixedHostPort = process.env.T02_TEST_DB_HOST_PORT
  const exposedPort =
    fixedHostPort === undefined
      ? 5432
      : { container: 5432, host: Number(fixedHostPort) }
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('aidream_test')
    .withUsername('aidream_test')
    .withPassword('aidream_test_password')
    .withExposedPorts(exposedPort)
    .start()

  process.env.DATABASE_URL = `postgresql://aidream_test:aidream_test_password@${container.getHost()}:${String(container.getMappedPort(5432))}/aidream_test?schema=public`
  process.env.AUTH_SECRET =
    'integration-secret-that-is-at-least-thirty-two-bytes'

  const executable =
    process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm'
  const prefix = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm'] : []
  await execFileAsync(
    executable,
    [
      ...prefix,
      'exec',
      'prisma',
      'migrate',
      'deploy',
      '--schema',
      'prisma/schema.prisma',
    ],
    { cwd: process.cwd(), env: process.env, windowsHide: true },
  )

  database = (await import('../src/client.js')).db
  repo = await import('../src/index.js')
}, 150_000)

beforeEach(async () => {
  await database.$executeRaw`TRUNCATE TABLE "user" CASCADE`
})

afterAll(async () => {
  await database.$disconnect()
  await container.stop()
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl
  }
  if (originalAuthSecret === undefined) {
    delete process.env.AUTH_SECRET
  } else {
    process.env.AUTH_SECRET = originalAuthSecret
  }
})

describe('database repository integration', () => {
  it('applies the migration to an empty database and returns null for missing rows', async () => {
    const tables = await database.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `
    expect(tables.map((row) => row.table_name)).toContain('episode')
    await expect(repo.findUserById('missing')).resolves.toBeNull()
    await expect(repo.findSeriesById('missing')).resolves.toBeNull()
    await expect(repo.findEpisodeById('missing')).resolves.toBeNull()
    await expect(repo.findAssetById('missing')).resolves.toBeNull()
    await expect(repo.findUploadSessionById('missing')).resolves.toBeNull()
    await expect(repo.findReportById('missing')).resolves.toBeNull()
  })

  it('maps unique/not-found errors, filters deleted users, and keeps parallel counters exact', async () => {
    const id = await createFixtureUser('counter')
    await expect(
      repo.findUserByEmail('user_counter@example.com'),
    ).resolves.toMatchObject({ id })
    await expect(repo.findUserByHandle('user_counter')).resolves.toMatchObject({
      id,
    })

    try {
      await repo.createUser({
        handle: 'user_counter',
        email: 'different@example.com',
        displayName: 'Duplicate',
      })
      throw new Error('expected duplicate error')
    } catch (error: unknown) {
      expectCode(error, 'E_DB_CONFLICT')
    }

    await Promise.all(
      Array.from({ length: 10 }, () => repo.incrementUserFollowerCount(id, 1)),
    )
    await repo.incrementUserSeriesCount(id, 1)
    await repo.updateUser(id, { bio: 'updated' })
    await expect(repo.findUserById(id)).resolves.toMatchObject({
      followerCount: 10,
      seriesCount: 1,
      bio: 'updated',
    })

    await database.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    await expect(repo.findUserById(id)).resolves.toBeNull()
    await expect(
      repo.findUserByEmail('user_counter@example.com'),
    ).resolves.toBeNull()
    await expect(repo.findUserByHandle('user_counter')).resolves.toBeNull()

    try {
      await repo.updateUser('missing', { displayName: 'No one' })
      throw new Error('expected not-found error')
    } catch (error: unknown) {
      expectCode(error, 'E_NOT_FOUND')
    }
  })

  it('maintains series and episode counters and excludes soft-deleted rows', async () => {
    const ownerId = await createFixtureUser('creator')
    const seriesId = await createFixtureSeries(ownerId, 'counter')
    const episode = await repo.createEpisode({
      seriesId,
      number: 1,
      title: 'First',
    })
    await repo.updateEpisode(episode.id, { description: 'updated' })
    await repo.updateEpisodeStatus(episode.id, 'PUBLISHED', {
      publishedAt: new Date('2026-08-21T00:00:00.000Z'),
    })
    await repo.updateSeries(seriesId, { synopsis: 'updated' })

    await expect(
      repo.listEpisodesBySeries({ seriesId, limit: 10 }),
    ).resolves.toMatchObject({
      items: [{ id: episode.id }],
    })
    await expect(
      repo.listSeriesByOwner({ ownerId, limit: 10 }),
    ).resolves.toMatchObject({
      items: [{ id: seriesId, episodeCount: 1 }],
    })

    try {
      await repo.createEpisode({ seriesId, number: 1, title: 'Duplicate' })
      throw new Error('expected duplicate episode number')
    } catch (error: unknown) {
      expectCode(error, 'E_DB_CONFLICT')
    }

    await repo.softDeleteEpisode(episode.id)
    await expect(repo.findEpisodeById(episode.id)).resolves.toBeNull()
    await expect(
      repo.listEpisodesBySeries({ seriesId, limit: 10 }),
    ).resolves.toMatchObject({
      items: [],
    })
    await repo.softDeleteSeries(seriesId)
    await expect(repo.findSeriesById(seriesId)).resolves.toBeNull()
    await expect(repo.findSeriesBySlug('series-counter')).resolves.toBeNull()
    await expect(
      repo.listSeriesByOwner({ ownerId, limit: 10 }),
    ).resolves.toMatchObject({
      items: [],
    })
  })

  it('persists upload JSON, assets, status metadata, and renditions', async () => {
    const userId = await createFixtureUser('upload')
    const upload = await repo.createUploadSession({
      // 키가 세션 id 를 품으므로 호출자가 정한다. (06 §1)
      id: randomUUID(),
      userId,
      fileName: 'movie.mp4',
      fileSize: 5_000_000_000n,
      mimeType: 'video/mp4',
      objectKey: 'original/movie.mp4',
      partSize: 5_000_000,
      totalParts: 2,
      expiresAt: new Date('2026-08-22T00:00:00.000Z'),
    })
    await repo.updateCompletedParts(upload.id, [
      { partNumber: 1, etag: 'etag-1' },
      { partNumber: 2, etag: 'etag-2' },
    ])
    await repo.updateUploadStatus(upload.id, 'UPLOADED', {
      s3UploadId: 's3-upload',
    })
    const asset = await repo.createAsset({
      uploadId: upload.id,
      originalKey: upload.objectKey,
    })
    await repo.incrementAssetAttempt(asset.id)
    await repo.updateAssetStatus(asset.id, 'READY', {
      sizeBytes: 5_000_000_000n,
      readyAt: new Date(),
    })
    const rendition = await repo.createRendition({
      assetId: asset.id,
      name: '720p',
      width: 1280,
      height: 720,
      bitrateKbps: 2500,
      playlistPath: 'hls/720p.m3u8',
      sizeBytes: 1_000_000_000n,
    })

    await expect(repo.findUploadSessionById(upload.id)).resolves.toMatchObject({
      fileSize: '5000000000',
      status: 'UPLOADED',
      completedParts: [
        { partNumber: 1, etag: 'etag-1' },
        { partNumber: 2, etag: 'etag-2' },
      ],
    })
    await expect(repo.findAssetById(asset.id)).resolves.toMatchObject({
      status: 'READY',
      attemptCount: 1,
      sizeBytes: '5000000000',
    })
    await expect(repo.listRenditionsByAsset(asset.id)).resolves.toEqual([
      expect.objectContaining({ id: rendition.id, sizeBytes: '1000000000' }),
    ])
  })

  it('paginates ten identical publish times without duplicates across an insertion boundary', async () => {
    const ownerId = await createFixtureUser('feed-owner')
    const seriesId = await createFixtureSeries(ownerId, 'feed')
    const publishedAt = new Date('2026-08-21T00:00:00.000Z')
    await database.episode.createMany({
      data: Array.from({ length: 10 }, (_, index) => ({
        id: `feed_episode_${index.toString().padStart(2, '0')}`,
        seriesId,
        number: index + 1,
        title: `Episode ${String(index + 1)}`,
        status: 'PUBLISHED' as const,
        publishedAt,
        rankScore: 50,
      })),
    })

    const first = await repo.listLatestFeed({ limit: 3 })
    expect(first.nextCursor).not.toBeNull()
    await database.episode.create({
      data: {
        id: 'feed_episode_new',
        seriesId,
        number: 11,
        title: 'Newer Episode',
        status: 'PUBLISHED',
        publishedAt: new Date('2026-08-21T01:00:00.000Z'),
      },
    })

    const seen = [...first.items.map((item) => item.id)]
    let cursor = first.nextCursor
    while (cursor !== null) {
      const page = await repo.listLatestFeed({ limit: 3, cursor })
      seen.push(...page.items.map((item) => item.id))
      cursor = page.nextCursor
    }
    expect(seen).toHaveLength(10)
    expect(new Set(seen).size).toBe(10)
    expect(seen).not.toContain('feed_episode_new')

    const popular = await repo.listPopularFeed({ limit: 4 })
    expect(popular.items).toHaveLength(4)
    expect(popular.nextCursor).not.toBeNull()
  })

  it('applies following and block filters and keeps social counters transactional', async () => {
    const viewerId = await createFixtureUser('viewer')
    const creatorId = await createFixtureUser('followed')
    const seriesId = await createFixtureSeries(creatorId, 'following')
    const episode = await repo.createEpisode({
      seriesId,
      number: 1,
      title: 'Followed',
    })
    await repo.updateEpisodeStatus(episode.id, 'PUBLISHED', {
      publishedAt: new Date(),
    })

    await repo.followUser(viewerId, creatorId)
    await expect(
      repo.listFollowingFeed(viewerId, { limit: 10 }),
    ).resolves.toMatchObject({
      items: [{ id: episode.id }],
    })
    await repo.likeEpisode(viewerId, episode.id)
    await repo.unlikeEpisode(viewerId, episode.id)
    await repo.unlikeEpisode(viewerId, episode.id)

    const comment = await repo.createComment({
      episodeId: episode.id,
      userId: viewerId,
      body: 'Great episode',
    })
    await expect(
      repo.listCommentsByEpisode({ episodeId: episode.id, limit: 10 }),
    ).resolves.toMatchObject({
      items: [{ id: comment.id }],
    })
    await repo.softDeleteComment(comment.id)
    await expect(
      repo.listCommentsByEpisode({ episodeId: episode.id, limit: 10 }),
    ).resolves.toMatchObject({
      items: [],
    })

    await repo.blockUser(viewerId, creatorId)
    await expect(
      repo.listLatestFeed({ viewerId, limit: 10 }),
    ).resolves.toMatchObject({ items: [] })
    await expect(
      repo.listFollowingFeed(viewerId, { limit: 10 }),
    ).resolves.toMatchObject({ items: [] })
    await repo.unfollowUser(viewerId, creatorId)
    await repo.unfollowUser(viewerId, creatorId)

    const storedEpisode = await database.episode.findUniqueOrThrow({
      where: { id: episode.id },
    })
    expect(storedEpisode.likeCount).toBe(0)
    expect(storedEpisode.commentCount).toBe(0)
  })

  it('lists and marks notifications and processes the report review queue', async () => {
    const userId = await createFixtureUser('moderation')
    const moderatorId = await createFixtureUser('moderator')
    const notification = await database.notification.create({
      data: { userId, type: 'MODERATION', payload: { message: 'hello' } },
    })
    await expect(
      repo.listNotifications({ userId, limit: 10 }),
    ).resolves.toMatchObject({
      items: [{ id: notification.id, readAt: null }],
    })
    const marked = await repo.markNotificationRead(notification.id, userId)
    expect(marked.id).toBe(notification.id)
    expect(marked.readAt).toBeInstanceOf(Date)

    const report = await repo.createReport({
      reporterId: userId,
      target: 'EPISODE',
      targetId: 'reported-episode',
      reason: 'SPAM',
    })
    await expect(
      repo.listReportsForReview({ status: ['OPEN'], limit: 10 }),
    ).resolves.toMatchObject({
      items: [{ id: report.id }],
    })
    await expect(
      repo.updateReportStatus(report.id, 'ACTIONED', {
        handledBy: moderatorId,
        handledAt: new Date(),
        actionNote: 'reviewed',
      }),
    ).resolves.toMatchObject({ id: report.id, status: 'ACTIONED' })

    try {
      await repo.createReport({
        reporterId: userId,
        target: 'EPISODE',
        targetId: 'reported-episode',
        reason: 'OTHER',
      })
      throw new Error('expected duplicate report')
    } catch (error: unknown) {
      expectCode(error, 'E_DB_CONFLICT')
    }
  })
})
