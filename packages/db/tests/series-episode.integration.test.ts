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

let container: StartedPostgreSqlContainer
let database: typeof import('../src/client.js').db
let repo: typeof import('../src/index.js')

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('aidream_t08')
    .withUsername('aidream_t08')
    .withPassword('aidream_t08_password')
    .start()
  process.env.DATABASE_URL = `postgresql://aidream_t08:aidream_t08_password@${container.getHost()}:${String(container.getMappedPort(5432))}/aidream_t08?schema=public`
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
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = originalDatabaseUrl
})

async function fixture(suffix: string): Promise<{
  ownerId: string
  seriesId: string
  assetId: string
}> {
  const owner = await database.user.create({
    data: {
      handle: `creator_${suffix}`,
      email: `creator_${suffix}@example.com`,
      displayName: `Creator ${suffix}`,
      role: 'CREATOR',
    },
  })
  const upload = await database.uploadSession.create({
    data: {
      userId: owner.id,
      status: 'UPLOADED',
      fileName: 'episode.mp4',
      fileSize: 1024,
      mimeType: 'video/mp4',
      objectKey: `originals/${owner.id}/${suffix}.mp4`,
      partSize: 1024,
      totalParts: 1,
      expiresAt: new Date('2026-08-26T00:00:00.000Z'),
    },
  })
  const asset = await database.videoAsset.create({
    data: {
      uploadId: upload.id,
      status: 'READY',
      originalKey: upload.objectKey,
    },
  })
  const series = await database.series.create({
    data: {
      ownerId: owner.id,
      slug: `series-${suffix}`,
      title: `Series ${suffix}`,
    },
  })
  return { ownerId: owner.id, seriesId: series.id, assetId: asset.id }
}

function expectCode(error: unknown, code: AppError['code']): void {
  expect(error).toBeInstanceOf(AppError)
  if (!(error instanceof AppError)) throw error
  expect(error.code).toBe(code)
}

describe('T08 series/episode repositories', () => {
  it('기본 시즌을 만들고 태그와 함께 DRAFT 에피소드를 생성한다', async () => {
    const data = await fixture('create')
    const episode = await repo.createEpisodeWithTags({
      seriesId: data.seriesId,
      seasonNumber: 1,
      number: 1,
      title: '첫 화',
      assetId: data.assetId,
      ageRating: 'ALL',
      aiDisclosure: 'AIDREAM',
      tags: ['ai-drama', '판타지'],
    })
    expect(episode.status).toBe('DRAFT')
    expect(typeof episode.seasonId).toBe('string')
    await expect(
      database.season.findUnique({
        where: { seriesId_number: { seriesId: data.seriesId, number: 1 } },
      }),
    ).resolves.not.toBeNull()
    expect(
      await database.episodeTag.count({ where: { episodeId: episode.id } }),
    ).toBe(2)
  })

  it('같은 시즌 화수와 자산 재사용을 정확한 코드로 거부한다', async () => {
    const data = await fixture('duplicate')
    const input = {
      seriesId: data.seriesId,
      seasonNumber: 1,
      number: 1,
      title: '첫 화',
      assetId: data.assetId,
      ageRating: 'ALL' as const,
      aiDisclosure: 'AIDREAM',
      tags: [] as string[],
    }
    await repo.createEpisodeWithTags(input)
    await repo
      .createEpisodeWithTags({ ...input, assetId: data.assetId, number: 1 })
      .catch((error: unknown) => {
        expectCode(error, 'E_EPISODE_NUMBER_DUPLICATE')
      })
    await repo
      .createEpisodeWithTags({ ...input, number: 2 })
      .catch((error: unknown) => {
        expectCode(error, 'E_DB_CONFLICT')
      })
  })

  it('기존 회차를 다른 시즌과 화수로 이동한다', async () => {
    const data = await fixture('move-episode')
    const episode = await repo.createEpisodeWithTags({
      seriesId: data.seriesId,
      seasonNumber: 1,
      number: 1,
      title: '이동할 회차',
      assetId: data.assetId,
      ageRating: 'ALL',
      aiDisclosure: 'AIDREAM',
      tags: [],
    })
    const moved = await repo.updateEpisodeWithTags(episode.id, {}, undefined, {
      seasonNumber: 2,
      number: 3,
    })
    expect(moved.number).toBe(3)
    await expect(
      database.season.findUnique({ where: { id: moved.seasonId ?? '' } }),
    ).resolves.toMatchObject({ number: 2 })
  })

  it('상태 전이와 공개 에피소드 수를 한 트랜잭션에서 맞춘다', async () => {
    const data = await fixture('transition')
    const episode = await repo.createEpisodeWithTags({
      seriesId: data.seriesId,
      seasonNumber: 1,
      number: 1,
      title: '공개 화',
      assetId: data.assetId,
      ageRating: 'ALL',
      aiDisclosure: 'AIDREAM',
      tags: [],
    })
    const publishedAt = new Date('2026-08-25T00:00:00.000Z')
    await repo.transitionEpisode(episode.id, 'PUBLISHED', {
      publishAt: null,
      publishedAt,
    })
    await expect(
      database.series.findUnique({ where: { id: data.seriesId } }),
    ).resolves.toMatchObject({ episodeCount: 1 })
    await repo.transitionEpisode(episode.id, 'HIDDEN', {
      publishAt: null,
      publishedAt,
    })
    await expect(
      database.series.findUnique({ where: { id: data.seriesId } }),
    ).resolves.toMatchObject({ episodeCount: 0 })
  })

  it('도래한 예약분만 정렬해 조회한다', async () => {
    const data = await fixture('scheduled')
    const episode = await repo.createEpisodeWithTags({
      seriesId: data.seriesId,
      seasonNumber: 1,
      number: 1,
      title: '예약 화',
      assetId: data.assetId,
      ageRating: 'ALL',
      aiDisclosure: 'AIDREAM',
      tags: [],
    })
    const due = new Date('2026-08-25T00:00:00.000Z')
    await database.episode.update({
      where: { id: episode.id },
      data: { status: 'SCHEDULED', publishAt: due },
    })
    await expect(repo.listScheduledEpisodesDue(due, 100)).resolves.toHaveLength(
      1,
    )
    await expect(
      repo.listScheduledEpisodesDue(new Date(due.getTime() - 1), 100),
    ).resolves.toHaveLength(0)
  })

  it('공개 목록과 상세에는 PUBLISHED 에피소드만 노출한다', async () => {
    const data = await fixture('public')
    const episode = await repo.createEpisodeWithTags({
      seriesId: data.seriesId,
      seasonNumber: 1,
      number: 1,
      title: '공개 화',
      assetId: data.assetId,
      ageRating: 'ALL',
      aiDisclosure: 'AIDREAM',
      tags: [],
    })
    await repo.transitionEpisode(episode.id, 'PUBLISHED', {
      publishAt: null,
      publishedAt: new Date(),
    })
    await expect(repo.listPublicSeries({ limit: 20 })).resolves.toMatchObject({
      items: [{ id: data.seriesId }],
    })
    await expect(
      repo.findPublicSeriesDetail(data.seriesId),
    ).resolves.toMatchObject({ episodes: [{ id: episode.id }] })
  })

  it('시리즈를 소프트 삭제하고 연결 자산 id를 반환한다', async () => {
    const data = await fixture('delete')
    await repo.createEpisodeWithTags({
      seriesId: data.seriesId,
      seasonNumber: 1,
      number: 1,
      title: '삭제 화',
      assetId: data.assetId,
      ageRating: 'ALL',
      aiDisclosure: 'AIDREAM',
      tags: [],
    })
    await expect(
      repo.softDeleteSeriesCascade(data.seriesId),
    ).resolves.toMatchObject({ assetIds: [data.assetId] })
    expect(
      await database.episode.count({
        where: { seriesId: data.seriesId, deletedAt: { not: null } },
      }),
    ).toBe(1)
    await expect(repo.findSeriesById(data.seriesId)).resolves.toBeNull()
  })

  it('자산의 소유자와 연결 에피소드를 함께 읽는다', async () => {
    const data = await fixture('asset')
    await expect(repo.findAssetOwnership(data.assetId)).resolves.toMatchObject({
      ownerId: data.ownerId,
      episodeId: null,
    })
  })
})
