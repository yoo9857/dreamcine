import type { User } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import { unblockUser, type UnblockUserDependencies } from './unblock-user'

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

const target = {
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
  followerCount: 0,
  seriesCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
} satisfies User

describe('unblockUser', () => {
  it('is idempotent at the repository boundary', async () => {
    const deps: UnblockUserDependencies = {
      findTarget: vi.fn().mockResolvedValue(target),
      unblock: vi.fn().mockResolvedValue(undefined),
    }
    await expect(unblockUser(session, 'creator', deps)).resolves.toBeUndefined()
    expect(deps.unblock).toHaveBeenCalledWith('viewer', 'creator')
  })

  it('rejects a missing user', async () => {
    const deps: UnblockUserDependencies = {
      findTarget: vi.fn().mockResolvedValue(null),
      unblock: vi.fn(),
    }
    await expect(unblockUser(session, 'missing', deps)).rejects.toMatchObject({
      code: 'E_USER_NOT_FOUND',
    })
  })
})
