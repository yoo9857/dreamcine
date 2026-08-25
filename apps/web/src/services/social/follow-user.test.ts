import { AppError } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import {
  followUser,
  unfollowUser,
  type FollowUserDependencies,
  type UnfollowUserDependencies,
} from './follow-user'

const target = {
  id: 'creator',
  handle: 'creator',
  email: 'creator@example.com',
  emailVerified: new Date('2026-01-01T00:00:00.000Z'),
  passwordHash: null,
  displayName: 'Creator',
  bio: null,
  avatarKey: null,
  role: 'CREATOR',
  status: 'ACTIVE',
  followerCount: 9,
  seriesCount: 1,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
} as const

const session = {
  userId: 'viewer',
  user: {
    id: 'viewer',
    handle: 'viewer',
    email: 'viewer@example.com',
    displayName: 'Viewer',
    role: 'VIEWER',
    status: 'ACTIVE',
    emailVerified: true,
  },
  expiresAt: new Date('2026-09-01T00:00:00.000Z'),
} satisfies RouteSession

function dependencies(): FollowUserDependencies {
  return {
    findTarget: vi.fn().mockResolvedValue(target),
    blocked: vi.fn().mockResolvedValue(false),
    follow: vi.fn().mockResolvedValue({ created: true, followerCount: 10 }),
    notify: vi.fn().mockResolvedValue(undefined),
  }
}

describe('followUser', () => {
  it('returns the transactional count and notifies only on creation', async () => {
    const deps = dependencies()
    await expect(followUser(session, 'creator', deps)).resolves.toEqual({
      followerCount: 10,
    })
    expect(deps.notify).toHaveBeenCalledOnce()

    vi.mocked(deps.follow).mockResolvedValue({
      created: false,
      followerCount: 10,
    })
    await followUser(session, 'creator', deps)
    expect(deps.notify).toHaveBeenCalledOnce()
  })

  it('rejects self-follow and blocked relationships', async () => {
    const self = dependencies()
    vi.mocked(self.findTarget).mockResolvedValue({ ...target, id: 'viewer' })
    await expect(followUser(session, 'viewer', self)).rejects.toMatchObject({
      code: 'E_USER_SELF_ACTION',
    } satisfies Partial<AppError>)

    const blocked = dependencies()
    vi.mocked(blocked.blocked).mockResolvedValue(true)
    await expect(followUser(session, 'creator', blocked)).rejects.toMatchObject(
      { code: 'E_SOCIAL_BLOCKED' } satisfies Partial<AppError>,
    )
  })
})

describe('unfollowUser', () => {
  it('is idempotent and returns the stored count', async () => {
    const deps: UnfollowUserDependencies = {
      findTarget: vi.fn().mockResolvedValue(target),
      unfollow: vi.fn().mockResolvedValue({ removed: false, followerCount: 9 }),
    }
    await expect(unfollowUser(session, 'creator', deps)).resolves.toEqual({
      followerCount: 9,
    })
  })

  it('rejects a missing target', async () => {
    const deps: UnfollowUserDependencies = {
      findTarget: vi.fn().mockResolvedValue(null),
      unfollow: vi.fn(),
    }
    await expect(unfollowUser(session, 'missing', deps)).rejects.toMatchObject({
      code: 'E_USER_NOT_FOUND',
    } satisfies Partial<AppError>)
  })
})
