import { AppError, type User } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import { blockUser, type BlockUserDependencies } from './block-user'
import { userFixture } from '@/src/test-support/entity-fixtures'

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
  expiresAt: new Date('2026-09-01T00:00:00.000Z'),
} satisfies RouteSession

const target = {
  ...userFixture(),
  id: 'creator',
  handle: 'creator',
  email: 'c@example.com',
  emailVerified: null,
  passwordHash: null,
  displayName: 'C',
  bio: null,
  avatarKey: null,
  role: 'CREATOR',
  status: 'ACTIVE',
  followerCount: 2,
  seriesCount: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
} satisfies User

describe('blockUser', () => {
  it('delegates the atomic block cascade', async () => {
    const deps: BlockUserDependencies = {
      findTarget: vi.fn().mockResolvedValue(target),
      block: vi.fn().mockResolvedValue({ created: true }),
    }
    await blockUser(session, 'creator', deps)
    expect(deps.block).toHaveBeenCalledWith('viewer', 'creator')
  })

  it('rejects self-blocking', async () => {
    const deps: BlockUserDependencies = {
      findTarget: vi.fn().mockResolvedValue({ ...target, id: 'viewer' }),
      block: vi.fn(),
    }
    await expect(blockUser(session, 'viewer', deps)).rejects.toMatchObject({
      code: 'E_USER_SELF_ACTION',
    } satisfies Partial<AppError>)
  })
})
