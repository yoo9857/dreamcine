import { describe, expect, it, vi } from 'vitest'

import { cancelAccountDeletion } from './cancel-account-deletion.js'

const NOW = new Date('2026-08-28T00:00:00.000Z')

describe('cancelAccountDeletion', () => {
  it('restores an account with a valid one-time token', async () => {
    const cancelDeletion = vi.fn().mockResolvedValue({ userId: 'user_1' })
    await expect(
      cancelAccountDeletion({ token: 'valid', now: NOW }, { cancelDeletion }),
    ).resolves.toEqual({ userId: 'user_1' })
    expect(cancelDeletion).toHaveBeenCalledWith('valid', NOW)
  })

  it('rejects expired or already consumed links', async () => {
    const cancelDeletion = vi.fn().mockResolvedValue(null)
    await expect(
      cancelAccountDeletion({ token: 'expired', now: NOW }, { cancelDeletion }),
    ).rejects.toMatchObject({ code: 'E_VALIDATION' })
  })
})
