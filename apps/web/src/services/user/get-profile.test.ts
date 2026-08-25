import type { User } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import { getProfile, type GetProfileDependencies } from './get-profile'

const user = {
  id: 'creator',
  handle: 'creator',
  email: 'c@example.com',
  emailVerified: null,
  passwordHash: null,
  displayName: 'Creator',
  bio: 'bio',
  avatarKey: null,
  role: 'CREATOR',
  status: 'ACTIVE',
  followerCount: 3,
  seriesCount: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
} satisfies User
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
  },
  expiresAt: new Date(),
} satisfies RouteSession

describe('getProfile', () => {
  it('returns public fields and viewer relationship state', async () => {
    const deps: GetProfileDependencies = {
      find: vi.fn().mockResolvedValue(user),
      socialState: vi
        .fn()
        .mockResolvedValue({ isFollowing: true, isBlocked: false }),
    }
    await expect(getProfile('creator', session, deps)).resolves.toMatchObject({
      handle: 'creator',
      followerCount: 3,
      isFollowing: true,
    })
  })

  it('rejects an unknown profile', async () => {
    const deps: GetProfileDependencies = {
      find: vi.fn().mockResolvedValue(null),
      socialState: vi.fn(),
    }
    await expect(getProfile('missing', null, deps)).rejects.toMatchObject({
      code: 'E_USER_NOT_FOUND',
    })
  })
})
