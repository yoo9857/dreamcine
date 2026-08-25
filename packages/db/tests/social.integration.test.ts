import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  startPostgresTestContext,
  stopPostgresTestContext,
  type PostgresTestContext,
} from './postgres-test-context.js'

let context: PostgresTestContext | undefined

beforeAll(async () => {
  context = await startPostgresTestContext('aidream_t10_social')
}, 150_000)

beforeEach(async () => {
  const current = requireContext()
  await current.database.$executeRaw`TRUNCATE TABLE "user" CASCADE`
})

afterAll(async () => stopPostgresTestContext(context))

function requireContext(): PostgresTestContext {
  if (context === undefined) throw new Error('database context missing')
  return context
}

async function fixture() {
  const context = requireContext()
  const [viewer, creator] = await Promise.all([
    context.database.user.create({
      data: {
        handle: 'viewer',
        email: 'viewer@example.com',
        displayName: 'Viewer',
      },
    }),
    context.database.user.create({
      data: {
        handle: 'creator',
        email: 'creator@example.com',
        displayName: 'Creator',
        role: 'CREATOR',
      },
    }),
  ])
  const series = await context.database.series.create({
    data: {
      ownerId: creator.id,
      slug: 'social-series',
      title: 'Social Series',
    },
  })
  const episode = await context.database.episode.create({
    data: {
      seriesId: series.id,
      number: 1,
      title: 'Episode',
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  })
  return { viewer, creator, episode }
}

describe('T10 social repositories', () => {
  it('keeps follow and like counters idempotent under repeated requests', async () => {
    const context = requireContext()
    const data = await fixture()
    await context.repo.followUser(data.viewer.id, data.creator.id)
    await context.repo.followUser(data.viewer.id, data.creator.id)
    await Promise.all(
      Array.from({ length: 10 }, () =>
        context.repo.likeEpisode(data.viewer.id, data.episode.id),
      ),
    )

    expect(await context.database.follow.count()).toBe(1)
    expect(
      (
        await context.database.user.findUniqueOrThrow({
          where: { id: data.creator.id },
        })
      ).followerCount,
    ).toBe(1)
    expect(await context.database.like.count()).toBe(1)
    expect(
      (
        await context.database.episode.findUniqueOrThrow({
          where: { id: data.episode.id },
        })
      ).likeCount,
    ).toBe(1)
  })

  it('removes both follow directions atomically when blocking', async () => {
    const context = requireContext()
    const data = await fixture()
    await context.repo.followUser(data.viewer.id, data.creator.id)
    await context.repo.followUser(data.creator.id, data.viewer.id)
    await context.repo.blockUser(data.viewer.id, data.creator.id)

    expect(await context.database.follow.count()).toBe(0)
    expect(await context.database.block.count()).toBe(1)
    const users = await context.database.user.findMany({
      orderBy: { handle: 'asc' },
    })
    expect(users.map((user) => user.followerCount)).toEqual([0, 0])
  })

  it('keeps a deleted parent visible while an active reply remains', async () => {
    const context = requireContext()
    const data = await fixture()
    const root = await context.repo.createComment({
      episodeId: data.episode.id,
      userId: data.viewer.id,
      body: 'root',
    })
    await context.repo.createComment({
      episodeId: data.episode.id,
      userId: data.creator.id,
      parentId: root.id,
      body: 'reply',
    })
    await context.repo.softDeleteComment(root.id)
    const page = await context.repo.listCommentThreadsByEpisode({
      episodeId: data.episode.id,
      limit: 20,
    })

    expect(page.items[0]?.deletedAt).not.toBeNull()
    expect(page.items[0]?.replies[0]?.body).toBe('reply')
  })

  it('keeps fanout notifications idempotent when the same batch runs twice', async () => {
    const current = requireContext()
    const data = await fixture()
    const batch = [
      {
        id: 'notification_fanout_retry',
        userId: data.viewer.id,
        payload: {
          type: 'NEW_EPISODE' as const,
          seriesId: 'series_1',
          episodeId: data.episode.id,
        },
      },
    ]

    await expect(current.repo.createNotifications(batch)).resolves.toBe(1)
    await expect(current.repo.createNotifications(batch)).resolves.toBe(0)
    await expect(
      current.database.notification.count({
        where: { id: 'notification_fanout_retry' },
      }),
    ).resolves.toBe(1)
  })
})
