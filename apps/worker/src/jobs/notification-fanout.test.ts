import { describe, expect, it, vi } from 'vitest'

import {
  deterministicNotificationId,
  drainNotificationFanout,
  notificationFanoutJob,
  type NotificationFanoutDependencies,
} from './notification-fanout'

describe('notificationFanoutJob', () => {
  it('inserts at most 1000 deterministic notifications and returns the resume cursor', async () => {
    const followers = Array.from(
      { length: 1000 },
      (_, index) => `user-${String(index)}`,
    )
    const deps: NotificationFanoutDependencies = {
      findEpisode: vi.fn().mockResolvedValue({
        id: 'ep',
        seriesId: 'series',
        ownerId: 'creator',
      }),
      followers: vi
        .fn()
        .mockResolvedValue({ items: followers, nextCursor: 'next' }),
      insert: vi.fn().mockResolvedValue(1000),
    }
    await expect(
      notificationFanoutJob({ type: 'NEW_EPISODE', episodeId: 'ep' }, deps),
    ).resolves.toEqual({ created: 1000, nextCursor: 'next' })
    expect(deps.followers).toHaveBeenCalledWith({
      creatorId: 'creator',
      limit: 1000,
    })
    expect(deps.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          id: deterministicNotificationId('user-0', 'ep'),
          userId: 'user-0',
          payload: { type: 'NEW_EPISODE', seriesId: 'series', episodeId: 'ep' },
        },
      ]),
    )
  })

  it('is retry-safe because recipient and episode produce the same id', () => {
    expect(deterministicNotificationId('user', 'episode')).toBe(
      deterministicNotificationId('user', 'episode'),
    )
    expect(deterministicNotificationId('other', 'episode')).not.toBe(
      deterministicNotificationId('user', 'episode'),
    )
  })

  it('drains 2500 followers in three batches and checkpoints each resume cursor', async () => {
    const process = vi
      .fn()
      .mockResolvedValueOnce({ created: 1000, nextCursor: 'cursor-1000' })
      .mockResolvedValueOnce({ created: 1000, nextCursor: 'cursor-2000' })
      .mockResolvedValueOnce({ created: 500, nextCursor: null })
    const checkpoint = vi.fn().mockResolvedValue(undefined)
    const pause = vi.fn().mockResolvedValue(undefined)

    await expect(
      drainNotificationFanout(
        { type: 'NEW_EPISODE', episodeId: 'ep' },
        { process, checkpoint, pause },
      ),
    ).resolves.toEqual({ created: 2500 })
    expect(process).toHaveBeenNthCalledWith(1, {
      type: 'NEW_EPISODE',
      episodeId: 'ep',
    })
    expect(process).toHaveBeenNthCalledWith(2, {
      type: 'NEW_EPISODE',
      episodeId: 'ep',
      cursor: 'cursor-1000',
    })
    expect(process).toHaveBeenNthCalledWith(3, {
      type: 'NEW_EPISODE',
      episodeId: 'ep',
      cursor: 'cursor-2000',
    })
    expect(checkpoint).toHaveBeenNthCalledWith(1, {
      type: 'NEW_EPISODE',
      episodeId: 'ep',
      cursor: 'cursor-1000',
    })
    expect(checkpoint).toHaveBeenNthCalledWith(2, {
      type: 'NEW_EPISODE',
      episodeId: 'ep',
      cursor: 'cursor-2000',
    })
    expect(pause).toHaveBeenCalledTimes(2)
  })
})
