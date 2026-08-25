import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  startPostgresTestContext,
  stopPostgresTestContext,
  type PostgresTestContext,
} from './postgres-test-context.js'

let context: PostgresTestContext | undefined

beforeAll(async () => {
  context = await startPostgresTestContext('aidream_t10_counter')
}, 150_000)

afterAll(async () => stopPostgresTestContext(context))

describe('T10 counter reconciliation', () => {
  it('corrects recent denormalized counts and increments buffered views', async () => {
    if (context === undefined) throw new Error('database context missing')
    const [viewer, creator] = await Promise.all([
      context.database.user.create({
        data: {
          handle: 'counter_viewer',
          email: 'counter_viewer@example.com',
          displayName: 'Viewer',
        },
      }),
      context.database.user.create({
        data: {
          handle: 'counter_creator',
          email: 'counter_creator@example.com',
          displayName: 'Creator',
          role: 'CREATOR',
        },
      }),
    ])
    const series = await context.database.series.create({
      data: {
        ownerId: creator.id,
        slug: 'counter-series',
        title: 'Counter Series',
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
    await Promise.all([
      context.database.follow.create({
        data: { followerId: viewer.id, followingId: creator.id },
      }),
      context.database.like.create({
        data: { userId: viewer.id, episodeId: episode.id },
      }),
      context.database.comment.create({
        data: { userId: viewer.id, episodeId: episode.id, body: 'comment' },
      }),
    ])

    const mismatches = await context.repo.reconcileRecentCounters(
      new Date(Date.now() - 60_000),
    )
    await context.repo.incrementEpisodeViews(episode.id, 3n)
    const [updatedEpisode, updatedCreator] = await Promise.all([
      context.database.episode.findUniqueOrThrow({ where: { id: episode.id } }),
      context.database.user.findUniqueOrThrow({ where: { id: creator.id } }),
    ])
    expect(mismatches.length).toBeGreaterThanOrEqual(3)
    expect(updatedEpisode).toMatchObject({
      likeCount: 1,
      commentCount: 1,
      viewCount: 3n,
    })
    expect(updatedCreator.followerCount).toBe(1)
  })
})
