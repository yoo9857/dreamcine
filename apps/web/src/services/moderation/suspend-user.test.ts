import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'

import { suspendUser, type SuspendUserDependencies } from './suspend-user'

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

function dependencies() {
  return {
    apply: vi.fn().mockResolvedValue({}),
  } as unknown as SuspendUserDependencies
}
describe('suspendUser', () => {
  it.each([1, 3, 7, 15, null] as const)(
    'accepts explicit duration %s',
    async (days) => {
      const deps = dependencies()
      await suspendUser(
        session('ADMIN'),
        'user_1',
        'SUSPENDED',
        'verified violation',
        days,
        deps,
      )
      expect(deps.apply).toHaveBeenCalledWith({
        actorId: 'operator',
        userId: 'user_1',
        status: 'SUSPENDED',
        reason: 'verified violation',
        durationDays: days,
      })
    },
  )
  it('rejects omitted duration', async () => {
    await expect(
      suspendUser(
        session('ADMIN'),
        'user_1',
        'SUSPENDED',
        'violation',
        undefined,
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: 'E_VALIDATION' })
  })
  it('allows warning without a suspension duration', async () => {
    const deps = dependencies()
    await suspendUser(
      session('ADMIN'),
      'user_1',
      'WARNING',
      'warning',
      undefined,
      deps,
    )
    expect(deps.apply).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'WARNING' }),
    )
  })
  it('rejects moderator and self sanctions', async () => {
    await expect(
      suspendUser(
        session('MODERATOR'),
        'user_1',
        'SUSPENDED',
        'reason',
        3,
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: 'E_PERM_DENIED' })
    await expect(
      suspendUser(
        session('ADMIN'),
        'operator',
        'SUSPENDED',
        'reason',
        3,
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: 'E_USER_SELF_ACTION' })
  })
})
