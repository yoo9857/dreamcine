import { AppError } from '@aidream/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => {
  const episodeFindMany = vi.fn()
  const episodeUpdate = vi.fn()
  const userFindMany = vi.fn()
  const userUpdate = vi.fn()
  const seriesUpdate = vi.fn()
  const createMany = vi.fn()
  const deleteMany = vi.fn()
  const tx = {
    episode: { findMany: episodeFindMany, update: episodeUpdate },
    user: { findMany: userFindMany, update: userUpdate },
    series: { update: seriesUpdate },
    viewFlushReceipt: { createMany },
  }
  return {
    episodeFindMany,
    episodeUpdate,
    userFindMany,
    userUpdate,
    seriesUpdate,
    createMany,
    deleteMany,
    tx,
  }
})

vi.mock('../client.js', () => ({
  db: {
    $transaction: (operation: (tx: typeof state.tx) => Promise<unknown>) =>
      operation(state.tx),
    viewFlushReceipt: { deleteMany: state.deleteMany },
  },
}))

import {
  applyClaimedEpisodeViews,
  purgeViewFlushReceiptsOlderThan,
  reconcileRecentCounters,
} from './counter.repo.js'

beforeEach(() => {
  state.episodeFindMany.mockReset()
  state.episodeUpdate.mockReset()
  state.userFindMany.mockReset()
  state.userUpdate.mockReset()
  state.seriesUpdate.mockReset()
  state.createMany.mockReset()
  state.deleteMany.mockReset()
})

describe('reconcileRecentCounters', () => {
  it('walks episodes and users by id in batches of 100', async () => {
    const since = new Date('2026-10-01T00:00:00.000Z')
    const page = Array.from({ length: 100 }, (_, index) => ({
      id: `ep_${String(index).padStart(3, '0')}`,
      likeCount: 0,
      commentCount: 0,
      _count: { likes: 0, comments: 0 },
    }))
    state.episodeFindMany.mockResolvedValueOnce(page).mockResolvedValueOnce([
      {
        id: 'ep_100',
        likeCount: 1,
        commentCount: 2,
        _count: { likes: 4, comments: 5 },
      },
    ])
    state.userFindMany.mockResolvedValue([
      { id: 'user', followerCount: 0, _count: { followers: 2 } },
    ])
    state.episodeUpdate.mockResolvedValue({})
    state.userUpdate.mockResolvedValue({})

    const mismatches = await reconcileRecentCounters(since)

    expect(mismatches).toEqual([
      {
        entity: 'episode',
        id: 'ep_100',
        field: 'likeCount',
        stored: '1',
        actual: '4',
      },
      {
        entity: 'episode',
        id: 'ep_100',
        field: 'commentCount',
        stored: '2',
        actual: '5',
      },
      {
        entity: 'user',
        id: 'user',
        field: 'followerCount',
        stored: '0',
        actual: '2',
      },
    ])
    expect(state.episodeFindMany).toHaveBeenCalledTimes(2)
    expect(state.episodeFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { updatedAt: { gte: since }, deletedAt: null },
        orderBy: { id: 'asc' },
        take: 100,
      }),
    )
    expect(state.episodeFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          updatedAt: { gte: since },
          deletedAt: null,
          id: { gt: 'ep_099' },
        },
        orderBy: { id: 'asc' },
        take: 100,
      }),
    )
    expect(state.episodeUpdate).toHaveBeenCalledWith({
      where: { id: 'ep_100' },
      data: { likeCount: 4, commentCount: 5 },
    })
    expect(state.userFindMany.mock.calls[0]?.[0]).toMatchObject({
      orderBy: { id: 'asc' },
      take: 100,
    })
    expect(state.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user' },
      data: { followerCount: 2 },
    })
  })
})

describe('applyClaimedEpisodeViews', () => {
  it('increments episode, series, and owner once per token', async () => {
    state.createMany.mockResolvedValueOnce({ count: 1 })
    state.episodeUpdate.mockResolvedValue({
      seriesId: 'series',
      series: { ownerId: 'owner' },
    })
    state.seriesUpdate.mockResolvedValue({})
    state.userUpdate.mockResolvedValue({})

    await expect(
      applyClaimedEpisodeViews({
        token: 'token',
        episodeId: 'ep',
        amount: 4n,
      }),
    ).resolves.toBe('applied')
    expect(state.episodeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ep', deletedAt: null },
        data: { viewCount: { increment: 4n } },
      }),
    )
    expect(state.seriesUpdate).toHaveBeenCalledWith({
      where: { id: 'series' },
      data: { totalViews: { increment: 4n } },
    })
    expect(state.userUpdate).toHaveBeenCalledWith({
      where: { id: 'owner' },
      data: { totalViews: { increment: 4n } },
    })

    state.createMany.mockResolvedValueOnce({ count: 0 })
    await expect(
      applyClaimedEpisodeViews({
        token: 'token',
        episodeId: 'ep',
        amount: 4n,
      }),
    ).resolves.toBe('duplicate')
    expect(state.episodeUpdate).toHaveBeenCalledTimes(1)
  })

  it('rejects a non-positive amount before writing a receipt', async () => {
    await expect(
      applyClaimedEpisodeViews({ token: 'token', episodeId: 'ep', amount: 0n }),
    ).rejects.toBeInstanceOf(AppError)
    expect(state.createMany).not.toHaveBeenCalled()
  })
})

describe('purgeViewFlushReceiptsOlderThan', () => {
  it('deletes receipts older than the cutoff', async () => {
    const olderThan = new Date('2026-10-01T00:00:00.000Z')
    state.deleteMany.mockResolvedValue({ count: 2 })
    await expect(purgeViewFlushReceiptsOlderThan(olderThan)).resolves.toBe(2)
    expect(state.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: olderThan } },
    })
  })
})
