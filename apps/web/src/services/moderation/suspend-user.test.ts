import type { User } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'

import { suspendUser, type SuspendUserDependencies } from './suspend-user'
import { userFixture } from '@/src/test-support/entity-fixtures'

function session(role: 'MODERATOR' | 'ADMIN'): RouteSession {
  return {
    userId: 'operator',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    user: {
      id: 'operator',
      handle: 'operator',
      email: 'operator@example.com',
      displayName: 'Operator',
      role,
      status: 'ACTIVE',
      emailVerified: true,
      tier: 'BRONZE',
      isVerified: false,
    },
  }
}

const user: User = {
  ...userFixture(),
  id: 'user_1',
  handle: 'user1',
  email: 'user1@example.com',
  emailVerified: new Date(),
  passwordHash: null,
  displayName: 'User',
  bio: null,
  avatarKey: null,
  role: 'VIEWER',
  status: 'ACTIVE',
  followerCount: 0,
  seriesCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

function dependencies() {
  return {
    findUser: vi.fn().mockResolvedValue(user),
    setStatus: vi.fn().mockResolvedValue(undefined),
    notify: vi.fn().mockResolvedValue(undefined),
  } as unknown as SuspendUserDependencies
}

describe('suspendUser', () => {
  it('ADMIN은 계정을 정지하고 알림을 남긴다', async () => {
    const deps = dependencies()
    await suspendUser(
      session('ADMIN'),
      'user_1',
      'SUSPENDED',
      '반복 위반',
      deps,
    )
    expect(deps.setStatus).toHaveBeenCalledWith('user_1', 'SUSPENDED')
    expect(deps.notify).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SUSPENDED' }),
    )
  })

  it('MODERATOR와 자기 계정 정지를 거부한다', async () => {
    await expect(
      suspendUser(
        session('MODERATOR'),
        'user_1',
        'SUSPENDED',
        'x',
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: 'E_PERM_DENIED' })
    await expect(
      suspendUser(
        session('ADMIN'),
        'operator',
        'SUSPENDED',
        'x',
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: 'E_USER_SELF_ACTION' })
  })
})
