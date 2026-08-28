import type { User } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import { userFixture } from '@/src/test-support/entity-fixtures'
import {
  deleteAccount,
  type DeleteAccountDependencies,
} from './delete-account.js'

const NOW = new Date('2026-08-28T00:00:00.000Z')
const PURGE_AT = new Date('2026-09-27T00:00:00.000Z')
const USER: User = {
  ...userFixture(),
  id: 'user_1',
  handle: 'creator',
  email: 'creator@example.com',
  passwordHash: 'password-hash',
}

function dependencies(): DeleteAccountDependencies {
  return {
    findUser: vi.fn().mockResolvedValue(USER),
    verifyPassword: vi.fn().mockResolvedValue(true),
    requestDeletion: vi.fn().mockResolvedValue({ scheduledPurgeAt: PURGE_AT }),
    createRecoveryToken: vi.fn().mockResolvedValue({}),
    deleteRecoveryTokens: vi.fn().mockResolvedValue(0),
    mailConfigured: vi.fn().mockReturnValue(true),
    sendRecoveryMail: vi.fn().mockResolvedValue(undefined),
    schedulePurge: vi.fn().mockResolvedValue(undefined),
    reportScheduleFailure: vi.fn(),
  }
}

describe('deleteAccount', () => {
  it('requires the exact handle and current password before scheduling purge', async () => {
    const deps = dependencies()
    await expect(
      deleteAccount(
        {
          userId: USER.id,
          confirmation: USER.handle,
          password: 'current password',
          now: NOW,
        },
        deps,
      ),
    ).resolves.toEqual({ scheduledPurgeAt: PURGE_AT.toISOString() })
    expect(deps.verifyPassword).toHaveBeenCalledWith(
      USER.passwordHash,
      'current password',
    )
    expect(deps.requestDeletion).toHaveBeenCalledWith({
      userId: USER.id,
      now: NOW,
    })
    expect(deps.sendRecoveryMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: USER.email,
        locale: 'ko',
        purgeDate: '2026년 9월 27일',
      }),
    )
    expect(deps.schedulePurge).toHaveBeenCalledWith(
      USER.id,
      30 * 24 * 60 * 60 * 1000,
    )
  })

  it('rejects a mismatched handle without mutating data', async () => {
    const deps = dependencies()
    await expect(
      deleteAccount(
        { userId: USER.id, confirmation: 'someone-else', now: NOW },
        deps,
      ),
    ).rejects.toMatchObject({ code: 'E_VALIDATION' })
    expect(deps.requestDeletion).not.toHaveBeenCalled()
  })

  it('rejects an invalid password', async () => {
    const deps = dependencies()
    vi.mocked(deps.verifyPassword).mockResolvedValue(false)
    await expect(
      deleteAccount(
        {
          userId: USER.id,
          confirmation: USER.handle,
          password: 'wrong',
          now: NOW,
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: 'E_AUTH_INVALID_CREDENTIALS' })
    expect(deps.requestDeletion).not.toHaveBeenCalled()
  })

  it('keeps a committed deletion request when the queue is temporarily down', async () => {
    const deps = dependencies()
    vi.mocked(deps.schedulePurge).mockRejectedValue(new Error('redis down'))
    await expect(
      deleteAccount(
        {
          userId: USER.id,
          confirmation: USER.handle,
          password: 'current password',
          now: NOW,
        },
        deps,
      ),
    ).resolves.toEqual({ scheduledPurgeAt: PURGE_AT.toISOString() })
    expect(deps.reportScheduleFailure).toHaveBeenCalledOnce()
  })

  it('does not hide the account when a recovery email cannot be delivered', async () => {
    const deps = dependencies()
    vi.mocked(deps.sendRecoveryMail).mockRejectedValue(
      new Error('smtp unavailable'),
    )
    await expect(
      deleteAccount(
        {
          userId: USER.id,
          confirmation: USER.handle,
          password: 'current password',
          now: NOW,
        },
        deps,
      ),
    ).rejects.toThrow('smtp unavailable')
    expect(deps.requestDeletion).not.toHaveBeenCalled()
    expect(deps.deleteRecoveryTokens).toHaveBeenLastCalledWith(
      'delete-cancel:user_1',
    )
  })

  it('blocks deletion when the recovery mail channel is unavailable', async () => {
    const deps = dependencies()
    vi.mocked(deps.mailConfigured).mockReturnValue(false)
    await expect(
      deleteAccount(
        {
          userId: USER.id,
          confirmation: USER.handle,
          password: 'current password',
          now: NOW,
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: 'E_INTERNAL' })
    expect(deps.createRecoveryToken).not.toHaveBeenCalled()
    expect(deps.requestDeletion).not.toHaveBeenCalled()
  })
})
