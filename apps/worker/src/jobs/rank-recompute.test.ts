import { describe, expect, it, vi } from 'vitest'

import {
  rankRecompute,
  type RankRecomputeDependencies,
} from './rank-recompute.js'

const now = new Date('2026-08-25T00:00:00.000Z')

function dependencies(): RankRecomputeDependencies {
  return {
    scan: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(0),
  }
}

describe('rankRecompute', () => {
  it('computes recent scores only through the pure ranking function', async () => {
    const deps = dependencies()
    vi.mocked(deps.scan).mockResolvedValue([
      {
        id: 'episode_1',
        viewCount: '100',
        likeCount: 2,
        commentCount: 1,
        publishedAt: now,
      },
    ])
    vi.mocked(deps.update).mockResolvedValue(1)

    await expect(
      rankRecompute({ scope: 'recent', now }, deps),
    ).resolves.toEqual({
      examined: 1,
      updated: 1,
      hasMore: false,
    })
    expect(deps.update).toHaveBeenCalledWith([
      { id: 'episode_1', score: (100 + 2 * 8 + 15) / Math.pow(2, 1.5) },
    ])
  })

  it('zeros expired scores and reports a full batch', async () => {
    const deps = dependencies()
    vi.mocked(deps.scan).mockResolvedValue([
      {
        id: 'episode_1',
        viewCount: '1',
        likeCount: 1,
        commentCount: 1,
        publishedAt: now,
      },
    ])
    vi.mocked(deps.update).mockResolvedValue(1)

    await expect(
      rankRecompute({ scope: 'expired', now, batchSize: 1 }, deps),
    ).resolves.toEqual({ examined: 1, updated: 1, hasMore: true })
    expect(deps.update).toHaveBeenCalledWith([{ id: 'episode_1', score: 0 }])
  })

  it('preserves an update failure for BullMQ retry', async () => {
    const deps = dependencies()
    vi.mocked(deps.scan).mockResolvedValue([
      {
        id: 'episode_1',
        viewCount: '1',
        likeCount: 0,
        commentCount: 0,
        publishedAt: now,
      },
    ])
    const error = new Error('database unavailable')
    vi.mocked(deps.update).mockRejectedValue(error)

    await expect(rankRecompute({ scope: 'recent', now }, deps)).rejects.toBe(
      error,
    )
  })
})
