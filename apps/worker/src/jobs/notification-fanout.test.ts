import { describe, expect, it, vi } from 'vitest'

import {
  deterministicNotificationId,
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
})
