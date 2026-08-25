import { Prisma } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  startPostgresTestContext,
  stopPostgresTestContext,
  type PostgresTestContext,
} from './postgres-test-context.js'

let context: PostgresTestContext | undefined

beforeAll(async () => {
  context = await startPostgresTestContext('aidream_t09_feed_performance')
}, 150_000)

beforeEach(async () => {
  await requireContext().database.$executeRaw`TRUNCATE TABLE "user" CASCADE`
})

afterAll(async () => stopPostgresTestContext(context))

function requireContext(): PostgresTestContext {
  if (context === undefined) throw new Error('database context missing')
  return context
}

async function explain(sql: Prisma.Sql): Promise<string> {
  const rows =
    await requireContext().database.$queryRaw<
      { readonly 'QUERY PLAN': string }[]
    >(sql)
  return rows.map((row) => row['QUERY PLAN']).join('\n')
}

function expectEpisodeIndexScan(plan: string, indexName: string): void {
  expect(plan).not.toMatch(/Seq Scan on episode e/u)
  expect(plan).toContain(`Index Scan using ${indexName} on episode e`)
}

describe('T09 feed query performance', () => {
  it('uses the ordered episode indexes for all three feed queries at 1000 rows', async () => {
    const current = requireContext()
    const [viewer, creator] = await Promise.all([
      current.database.user.create({
        data: {
          handle: 'feed_plan_viewer',
          email: 'feed-plan-viewer@example.com',
          displayName: 'Feed plan viewer',
        },
      }),
      current.database.user.create({
        data: {
          handle: 'feed_plan_creator',
          email: 'feed-plan-creator@example.com',
          displayName: 'Feed plan creator',
          role: 'CREATOR',
        },
      }),
    ])
    const series = await current.database.series.create({
      data: {
        ownerId: creator.id,
        slug: 'feed-plan-series',
        title: 'Feed plan series',
      },
    })
    const baseTime = new Date('2026-08-01T00:00:00.000Z').getTime()
    await current.database.episode.createMany({
      data: Array.from({ length: 1000 }, (_, index) => ({
        id: `feed_plan_${String(index).padStart(4, '0')}`,
        seriesId: series.id,
        number: index + 1,
        title: `Feed plan episode ${String(index + 1)}`,
        status: 'PUBLISHED' as const,
        publishedAt: new Date(baseTime + index * 1000),
        rankScore: index,
      })),
    })
    await current.database.follow.create({
      data: { followerId: viewer.id, followingId: creator.id },
    })
    await current.database.$executeRaw`ANALYZE episode`
    await current.database.$executeRaw`ANALYZE series`
    await current.database.$executeRaw`ANALYZE "user"`
    await current.database.$executeRaw`ANALYZE follow`

    const popular = await explain(Prisma.sql`
      EXPLAIN (ANALYZE, FORMAT TEXT)
      SELECT e.id
      FROM episode e
      INNER JOIN series s ON s.id = e.series_id
      INNER JOIN "user" creator ON creator.id = s.owner_id
      WHERE e.status = 'PUBLISHED'::"EpisodeStatus"
        AND e.deleted_at IS NULL
        AND e.published_at IS NOT NULL
        AND s.deleted_at IS NULL
        AND creator.deleted_at IS NULL
        AND creator.status = 'ACTIVE'::"UserStatus"
      ORDER BY e.rank_score DESC, e.id DESC
      LIMIT 21
    `)
    const latest = await explain(Prisma.sql`
      EXPLAIN (ANALYZE, FORMAT TEXT)
      SELECT e.id
      FROM episode e
      INNER JOIN series s ON s.id = e.series_id
      INNER JOIN "user" creator ON creator.id = s.owner_id
      WHERE e.status = 'PUBLISHED'::"EpisodeStatus"
        AND e.deleted_at IS NULL
        AND e.published_at IS NOT NULL
        AND s.deleted_at IS NULL
        AND creator.deleted_at IS NULL
        AND creator.status = 'ACTIVE'::"UserStatus"
      ORDER BY e.published_at DESC, e.id DESC
      LIMIT 21
    `)
    const following = await explain(Prisma.sql`
      EXPLAIN (ANALYZE, FORMAT TEXT)
      SELECT e.id
      FROM episode e
      INNER JOIN series s ON s.id = e.series_id
      INNER JOIN "user" creator ON creator.id = s.owner_id
      WHERE e.status = 'PUBLISHED'::"EpisodeStatus"
        AND e.deleted_at IS NULL
        AND e.published_at IS NOT NULL
        AND s.deleted_at IS NULL
        AND creator.deleted_at IS NULL
        AND creator.status = 'ACTIVE'::"UserStatus"
        AND EXISTS (
          SELECT 1 FROM follow f
          WHERE f.follower_id = ${viewer.id}
            AND f.following_id = s.owner_id
        )
      ORDER BY e.published_at DESC, e.id DESC
      LIMIT 21
    `)

    expectEpisodeIndexScan(popular, 'episode_feed_popular_idx')
    expectEpisodeIndexScan(latest, 'episode_feed_latest_idx')
    expectEpisodeIndexScan(following, 'episode_feed_latest_idx')
  })
})
