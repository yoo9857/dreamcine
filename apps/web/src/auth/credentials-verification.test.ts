import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findEmail: vi.fn(),
  findHandle: vi.fn(),
  verifyPassword: vi.fn(),
}))

vi.mock('@aidream/db', () => ({
  createAuthSession: vi.fn(),
  findUserByEmail: mocks.findEmail,
  findUserByHandle: mocks.findHandle,
}))

vi.mock('./adapter', () => ({ createAuthAdapter: () => ({}) }))
vi.mock('./password', () => ({ verifyPassword: mocks.verifyPassword }))
vi.mock('./session', () => ({
  SESSION_MAX_AGE_SEC: 2_592_000,
  SESSION_UPDATE_AGE_SEC: 86_400,
}))

const { authorizeCredentials } = await import('./config')

const USER = {
  id: 'user_1',
  email: 'member@example.com',
  handle: 'member_1',
  displayName: 'Member',
  passwordHash: 'hash',
  status: 'ACTIVE',
  emailVerified: new Date('2026-08-27T00:00:00.000Z'),
}

beforeEach(() => {
  mocks.findEmail.mockReset().mockResolvedValue(USER)
  mocks.findHandle.mockReset().mockResolvedValue(USER)
  mocks.verifyPassword.mockReset().mockResolvedValue(true)
})

describe('authorizeCredentials email verification', () => {
  it('allows a verified active account', async () => {
    await expect(
      authorizeCredentials({
        email: USER.email,
        password: 'safe-password-123',
      }),
    ).resolves.toEqual({
      id: USER.id,
      email: USER.email,
      name: USER.displayName,
    })
  })

  it('rejects an account until its verification link has been consumed', async () => {
    mocks.findEmail.mockResolvedValueOnce({ ...USER, emailVerified: null })

    await expect(
      authorizeCredentials({
        email: USER.email,
        password: 'safe-password-123',
      }),
    ).resolves.toBeNull()
  })

  it('applies the same verification rule to username login', async () => {
    mocks.findHandle.mockResolvedValueOnce({ ...USER, emailVerified: null })

    await expect(
      authorizeCredentials({
        email: USER.handle,
        password: 'safe-password-123',
      }),
    ).resolves.toBeNull()
    expect(mocks.findHandle).toHaveBeenCalledWith(USER.handle)
  })
})
