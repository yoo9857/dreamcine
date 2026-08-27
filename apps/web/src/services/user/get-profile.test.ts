import type { User } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import { getProfile, type GetProfileDependencies } from './get-profile'
import { userFixture } from '@/src/test-support/entity-fixtures'

const user = {
  ...userFixture(),
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
    tier: 'BRONZE',
    isVerified: false,
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
      links: vi.fn().mockResolvedValue([
        {
          id: 'l1',
          kind: 'YOUTUBE',
          label: 'YouTube',
          url: 'https://y.tld',
          order: 0,
        },
      ]),
    }
    await expect(getProfile('creator', session, deps)).resolves.toMatchObject({
      handle: 'creator',
      followerCount: 3,
      isFollowing: true,
      isVerified: false,
      channelKeywords: [],
      links: [{ kind: 'YOUTUBE', url: 'https://y.tld' }],
    })
  })

  it('hides the follower count from other viewers when the owner opted out', async () => {
    const deps: GetProfileDependencies = {
      find: vi
        .fn()
        .mockResolvedValue(userFixture({ ...user, hideFollowerCount: true })),
      socialState: vi
        .fn()
        .mockResolvedValue({ isFollowing: false, isBlocked: false }),
      links: vi.fn().mockResolvedValue([]),
    }
    await expect(getProfile('creator', session, deps)).resolves.toMatchObject({
      followerCount: null,
    })
  })

  it('keeps the follower count visible to the owner', async () => {
    const deps: GetProfileDependencies = {
      find: vi
        .fn()
        .mockResolvedValue(userFixture({ ...user, hideFollowerCount: true })),
      socialState: vi.fn(),
      links: vi.fn().mockResolvedValue([]),
    }
    const ownerSession = { ...session, userId: user.id }
    await expect(
      getProfile('creator', ownerSession, deps),
    ).resolves.toMatchObject({ followerCount: 3 })
  })

  it('hides a PRIVATE profile from everyone but its owner', async () => {
    const deps: GetProfileDependencies = {
      find: vi
        .fn()
        .mockResolvedValue(
          userFixture({ ...user, profileVisibility: 'PRIVATE' }),
        ),
      socialState: vi.fn(),
      links: vi.fn().mockResolvedValue([]),
    }
    await expect(getProfile('creator', session, deps)).rejects.toMatchObject({
      code: 'E_USER_NOT_FOUND',
    })
  })

  it('rejects an unknown profile', async () => {
    const deps: GetProfileDependencies = {
      find: vi.fn().mockResolvedValue(null),
      socialState: vi.fn(),
      links: vi.fn(),
    }
    await expect(getProfile('missing', null, deps)).rejects.toMatchObject({
      code: 'E_USER_NOT_FOUND',
    })
  })
})
