import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

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
let containerStarted = false
let databaseConnected = false

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('aidream_playback')
    .withUsername('aidream_playback')
    .withPassword('aidream_playback_password')
    .start()
  containerStarted = true
  process.env.DATABASE_URL = `postgresql://aidream_playback:aidream_playback_password@${container.getHost()}:${String(container.getMappedPort(5432))}/aidream_playback?schema=public`

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
  databaseConnected = true
  repo = await import('../src/index.js')
}, 150_000)

beforeEach(async () => {
  await database.$executeRaw`TRUNCATE TABLE "user" CASCADE`
})

afterAll(async () => {
  if (databaseConnected) await database.$disconnect()
  if (containerStarted) await container.stop()
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = originalDatabaseUrl
})

async function fixture(): Promise<{
  ownerId: string
  viewerId: string
  episodeId: string
}> {
  const [owner, viewer] = await Promise.all([
    database.user.create({
      data: {
        handle: 'playback_owner',
        email: 'owner@example.com',
        displayName: 'Owner',
      },
    }),
    database.user.create({
      data: {
        handle: 'playback_viewer',
        email: 'viewer@example.com',
        displayName: 'Viewer',
      },
    }),
  ])
  const series = await database.series.create({
    data: { ownerId: owner.id, slug: 'playback', title: 'Playback' },
  })
  const asset = await database.videoAsset.create({
    data: {
      status: 'READY',
      originalKey: 'originals/playback.mp4',
      durationSec: 120,
      posterKey: 'thumbs/asset/poster.jpg',
      renditions: {
        create: {
          name: '720p',
          width: 1280,
          height: 720,
          bitrateKbps: 2800,
          playlistPath: 'hls/asset/720p/index.m3u8',
          sizeBytes: 1000,
        },
      },
    },
  })
  const episode = await database.episode.create({
    data: {
      seriesId: series.id,
      assetId: asset.id,
      number: 1,
      title: 'Episode',
      status: 'PUBLISHED',
      ageRating: 'A15',
    },
  })
  return { ownerId: owner.id, viewerId: viewer.id, episodeId: episode.id }
}

describe('playback repository', () => {
  it('에피소드·소유자·자산·렌디션을 한 조회로 반환한다', async () => {
    const data = await fixture()
    await expect(
      repo.findPlaybackEpisode(data.episodeId),
    ).resolves.toMatchObject({
      id: data.episodeId,
      ownerId: data.ownerId,
      status: 'PUBLISHED',
      ageRating: 'A15',
      asset: {
        status: 'READY',
        durationSec: 120,
        renditions: [{ name: '720p', width: 1280, height: 720 }],
      },
    })
    await expect(repo.findPlaybackEpisode('missing')).resolves.toBeNull()
  })

  it('양방향 중 어느 쪽이든 차단이면 true다', async () => {
    const data = await fixture()
    await expect(
      repo.hasBlockBetween(data.ownerId, data.viewerId),
    ).resolves.toBe(false)
    await database.block.create({
      data: { blockerId: data.viewerId, blockedId: data.ownerId },
    })
    await expect(
      repo.hasBlockBetween(data.ownerId, data.viewerId),
    ).resolves.toBe(true)
  })

  it('이어보기 좌표를 생성하고 같은 키를 갱신한다', async () => {
    const data = await fixture()
    await expect(
      repo.findWatchProgress(data.viewerId, data.episodeId),
    ).resolves.toBeNull()
    await repo.upsertWatchProgress({
      userId: data.viewerId,
      episodeId: data.episodeId,
      positionSec: 30,
      completed: false,
    })
    await repo.upsertWatchProgress({
      userId: data.viewerId,
      episodeId: data.episodeId,
      positionSec: 119,
      completed: true,
    })
    await expect(
      repo.findWatchProgress(data.viewerId, data.episodeId),
    ).resolves.toMatchObject({
      positionSec: 119,
      completed: true,
    })
    await expect(database.watchProgress.count()).resolves.toBe(1)
  })
})
