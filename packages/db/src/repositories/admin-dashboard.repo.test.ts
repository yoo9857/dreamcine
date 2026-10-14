import { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'

const queryRaw = vi.hoisted(() =>
  vi.fn<(sql: Prisma.Sql) => Promise<unknown[]>>(),
)
const findMany = vi.hoisted(() => vi.fn())
vi.mock('../client.js', () => ({
  db: {
    $queryRaw: queryRaw,
    episode: { findMany },
  },
}))

import { getAdminAnalyticsSnapshot } from './admin-dashboard.repo.js'

const episode = {
  id: 'ep',
  title: 'Title',
  viewCount: 10n,
  avgWatchSec: 30,
  durationSec: 60,
  series: { title: 'Series' },
}

describe('getAdminAnalyticsSnapshot', () => {
  it('sums published views in SQL and keeps the top ten episodes', async () => {
    queryRaw
      .mockResolvedValueOnce([{ views: 10n, watchSeconds: 7200n }])
      .mockResolvedValueOnce([{ uniqueViewers: 3n }])
    findMany.mockResolvedValue([episode])

    const snapshot = await getAdminAnalyticsSnapshot()

    expect(snapshot.metrics).toMatchObject({
      views: 10,
      watchHours: 2,
      averageViewDurationSec: 720,
      uniqueViewers: 3,
    })
    expect(snapshot.topVideos[0]).toMatchObject({
      views: 10,
      averageViewedPercent: 50,
    })
    expect(findMany).toHaveBeenCalledTimes(1)
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }))
    const sql = queryRaw.mock.calls.map((call) => call[0].sql).join('\n')
    expect(sql).toContain('SUM(view_count)')
    expect(sql).toContain('COUNT(DISTINCT wp.user_id)')
    expect(sql).toContain('PUBLISHED')
  })

  it('accepts numeric aggregates returned as strings and treats zero views as zero duration', async () => {
    queryRaw
      .mockResolvedValueOnce([{ views: '0', watchSeconds: '0' }])
      .mockResolvedValueOnce([{ uniqueViewers: '4' }])
    findMany.mockResolvedValue([
      { ...episode, durationSec: null, viewCount: 0n },
    ])

    const snapshot = await getAdminAnalyticsSnapshot()

    expect(snapshot.metrics.averageViewDurationSec).toBe(0)
    expect(snapshot.metrics.uniqueViewers).toBe(4)
    expect(snapshot.topVideos[0]?.averageViewedPercent).toBeNull()
  })

  it('rejects an aggregate shape the SQL cast cannot produce', async () => {
    queryRaw.mockResolvedValue([{ views: { bad: true }, watchSeconds: 0 }])
    findMany.mockResolvedValue([])
    await expect(getAdminAnalyticsSnapshot()).rejects.toMatchObject({
      code: 'E_INTERNAL',
    })
  })
})
