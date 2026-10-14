import { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'

const findFirst = vi.hoisted(() => vi.fn())
const findMany = vi.hoisted(() => vi.fn())
const groupBy = vi.hoisted(() => vi.fn())
const queryRaw = vi.hoisted(() =>
  vi.fn<(sql: Prisma.Sql) => Promise<unknown[]>>(),
)
vi.mock('../client.js', () => ({
  db: {
    series: { findFirst },
    episode: { findMany },
    watchProgress: { groupBy },
    $queryRaw: queryRaw,
  },
}))

import { getStudioSeriesAnalyticsRecord } from './studio.repo.js'

describe('getStudioSeriesAnalyticsRecord', () => {
  it('returns null without loading viewers when the series is not owned', async () => {
    findFirst.mockResolvedValue(null)
    await expect(
      getStudioSeriesAnalyticsRecord('owner', 'series'),
    ).resolves.toBeNull()
    expect(findMany).not.toHaveBeenCalled()
    expect(queryRaw).not.toHaveBeenCalled()
  })

  it('counts distinct viewers in SQL and keeps one row per episode', async () => {
    findFirst.mockResolvedValue({ id: 'series', title: 'Show' })
    findMany.mockResolvedValue([
      {
        id: 'ep',
        title: 'Ep',
        number: 1,
        status: 'PUBLISHED',
        thumbKey: null,
        durationSec: 10,
        viewCount: 4n,
        impressionCount: 5n,
        likeCount: 1,
        commentCount: 2,
        shareCount: 3,
        avgWatchSec: 6,
        publishedAt: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        season: { number: 1, title: 'S' },
        asset: null,
      },
    ])
    groupBy
      .mockResolvedValueOnce([{ episodeId: 'ep', _count: { _all: 2 } }])
      .mockResolvedValueOnce([{ episodeId: 'ep', _count: { _all: 1 } }])
    queryRaw.mockResolvedValue([{ uniqueViewers: 8n, completedViewers: '3' }])

    const record = await getStudioSeriesAnalyticsRecord('owner', 'series')

    expect(record?.totals.uniqueViewers).toBe(8)
    expect(record?.totals.completedViewers).toBe(3)
    expect(record?.episodes).toHaveLength(1)
    expect(record?.episodes[0]).toMatchObject({
      uniqueViewers: 2,
      completedViewers: 1,
    })
    const sql = queryRaw.mock.calls[0]?.[0]
    expect(sql?.sql).toContain('COUNT(DISTINCT wp.user_id)')
    expect(sql?.sql).toContain('FILTER (WHERE wp.completed)')
    expect(sql?.values).toContain('series')
  })
})
