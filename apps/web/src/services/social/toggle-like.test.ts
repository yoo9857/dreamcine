import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import { addLike, removeLike, type ToggleLikeDependencies } from './toggle-like'

const session = {
  userId: 'viewer',
  user: {
    id: 'viewer',
    handle: 'viewer',
    email: 'v@example.com',
    displayName: 'V',
    role: 'VIEWER',
    status: 'ACTIVE',
    emailVerified: true,
    tier: 'BRONZE',
    isVerified: false,
  },
  expiresAt: new Date(),
} satisfies RouteSession

function dependencies(): ToggleLikeDependencies {
  return {
    findEpisode: vi.fn().mockResolvedValue({
      id: 'ep',
      ownerId: 'creator',
      status: 'PUBLISHED',
      ageRating: 'ALL',
      asset: null,
    }),
    blocked: vi.fn().mockResolvedValue(false),
    add: vi.fn().mockResolvedValue({ created: true, likeCount: 4 }),
    remove: vi.fn().mockResolvedValue({ removed: true, likeCount: 3 }),
    notify: vi.fn().mockResolvedValue(undefined),
  }
}

describe('toggle like', () => {
  it('returns canonical counts and notifies only for a newly created like', async () => {
    const deps = dependencies()
    await expect(addLike(session, 'ep', deps)).resolves.toEqual({
      liked: true,
      likeCount: 4,
    })
    expect(deps.notify).toHaveBeenCalledOnce()
    vi.mocked(deps.add).mockResolvedValue({ created: false, likeCount: 4 })
    await addLike(session, 'ep', deps)
    expect(deps.notify).toHaveBeenCalledOnce()
  })

  it('is idempotent when removing and rejects blocked interaction', async () => {
    const deps = dependencies()
    await expect(removeLike(session, 'ep', deps)).resolves.toEqual({
      liked: false,
      likeCount: 3,
    })
    vi.mocked(deps.blocked).mockResolvedValue(true)
    await expect(addLike(session, 'ep', deps)).rejects.toMatchObject({
      code: 'E_SOCIAL_BLOCKED',
    })
  })
})
