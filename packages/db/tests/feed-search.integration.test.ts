import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  startPostgresTestContext,
  stopPostgresTestContext,
  type PostgresTestContext,
} from './postgres-test-context.js'

let context: PostgresTestContext | undefined

beforeAll(async () => {
  context = await startPostgresTestContext('aidream_t09_feed_search')
}, 150_000)

beforeEach(async () => {
  await requireContext().database.$executeRaw`TRUNCATE TABLE "user" CASCADE`
})

afterAll(async () => stopPostgresTestContext(context))

function requireContext(): PostgresTestContext {
  if (context === undefined) throw new Error('database context missing')
  return context
}

describe('T09 feed cursor integration', () => {
  it('paginates 20 identical publish times without duplicates across an insertion boundary', async () => {
    const current = requireContext()
    const owner = await current.database.user.create({
      data: {
        handle: 'feed_cursor_owner',
        email: 'feed-cursor-owner@example.com',
        displayName: 'Feed cursor owner',
        role: 'CREATOR',
      },
    })
    const series = await current.database.series.create({
      data: {
        ownerId: owner.id,
        slug: 'feed-cursor-series',
        title: 'Feed cursor series',
      },
    })
    const publishedAt = new Date('2026-08-25T00:00:00.000Z')
    await current.database.episode.createMany({
      data: Array.from({ length: 20 }, (_, index) => ({
        id: `feed_cursor_${String(index).padStart(2, '0')}`,
        seriesId: series.id,
        number: index + 1,
        title: `Episode ${String(index + 1)}`,
        status: 'PUBLISHED' as const,
        publishedAt,
      })),
    })

    const first = await current.repo.listLatestFeed({ limit: 3 })
    await current.database.episode.create({
      data: {
        id: 'feed_cursor_new',
        seriesId: series.id,
        number: 21,
        title: 'Inserted after page one',
        status: 'PUBLISHED',
        publishedAt: new Date('2026-08-25T01:00:00.000Z'),
      },
    })

    const seen = [...first.items.map((item) => item.id)]
    let cursor = first.nextCursor
    while (cursor !== null) {
      const page = await current.repo.listLatestFeed({ limit: 3, cursor })
      seen.push(...page.items.map((item) => item.id))
      cursor = page.nextCursor
    }

    expect(seen).toHaveLength(20)
    expect(new Set(seen).size).toBe(20)
    expect(seen).not.toContain('feed_cursor_new')
  })
})
