import type { User } from '@aidream/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  consumeToken: vi.fn(),
  createToken: vi.fn(),
  deleteSessions: vi.fn(),
  deleteTokens: vi.fn(),
  error: vi.fn(),
  findEmail: vi.fn(),
  hash: vi.fn(),
  info: vi.fn(),
  sendReset: vi.fn(),
  setVerified: vi.fn(),
  updatePassword: vi.fn(),
}))

vi.mock('@aidream/db', () => ({
  consumeVerificationToken: mocks.consumeToken,
  createVerificationToken: mocks.createToken,
  deleteAuthSessionsByUser: mocks.deleteSessions,
  deleteVerificationTokensFor: mocks.deleteTokens,
  findUserByEmail: mocks.findEmail,
  setUserEmailVerified: mocks.setVerified,
  updateUserPasswordHash: mocks.updatePassword,
}))
vi.mock('@/src/auth/password', () => ({ hashPassword: mocks.hash }))
vi.mock('@/src/lib/logger', () => ({
  getLogger: () => ({ error: mocks.error, info: mocks.info }),
}))
vi.mock('@/src/lib/mail', () => ({
  sendPasswordResetMail: mocks.sendReset,
  sendVerificationMail: vi.fn(),
}))

const { requestPasswordReset } = await import('./request-password-reset.js')
const { resetPassword } = await import('./reset-password.js')
const { verifyEmail } = await import('./verify-email.js')

const NOW = new Date('2026-08-24T00:00:00.000Z')
const USER: User = {
  id: 'user_1',
  handle: 'creator',
  email: 'creator@example.com',
  emailVerified: null,
  passwordHash: 'old-hash',
  displayName: 'Creator',
  bio: null,
  avatarKey: null,
  role: 'CREATOR',
  status: 'ACTIVE',
  followerCount: 0,
  seriesCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
}

beforeEach(() => {
  mocks.consumeToken.mockReset()
  mocks.createToken.mockReset().mockResolvedValue(undefined)
  mocks.deleteSessions.mockReset().mockResolvedValue(2)
  mocks.deleteTokens.mockReset().mockResolvedValue(undefined)
  mocks.error.mockReset()
  mocks.findEmail.mockReset().mockResolvedValue(USER)
  mocks.hash.mockReset().mockResolvedValue('new-hash')
  mocks.info.mockReset()
  mocks.sendReset.mockReset().mockResolvedValue(undefined)
  mocks.setVerified
    .mockReset()
    .mockImplementation((_id: string, at: Date) =>
      Promise.resolve({ ...USER, emailVerified: at }),
    )
  mocks.updatePassword.mockReset().mockResolvedValue(undefined)
})

describe('requestPasswordReset', () => {
  it('기존 토큰을 지우고 새 토큰 메일을 보낸다', async () => {
    await requestPasswordReset({ email: USER.email })

    expect(mocks.deleteTokens).toHaveBeenCalledWith(`reset:${USER.email}`)
    expect(mocks.createToken).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: `reset:${USER.email}` }),
    )
    expect(mocks.sendReset).toHaveBeenCalledWith(
      expect.objectContaining({ to: USER.email }),
    )
  })

  it('없는 계정도 성공으로 처리하고 메일 실패는 로그만 남긴다', async () => {
    mocks.findEmail.mockResolvedValueOnce(null)
    await expect(
      requestPasswordReset({ email: 'missing@example.com' }),
    ).resolves.toBeUndefined()
    expect(mocks.info).toHaveBeenCalledOnce()

    const mailError = new Error('smtp down')
    mocks.sendReset.mockRejectedValue(mailError)
    await expect(
      requestPasswordReset({ email: USER.email }),
    ).resolves.toBeUndefined()
    expect(mocks.error).toHaveBeenCalledWith(
      { err: mailError, userId: USER.id },
      'password reset mail delivery failed',
    )
  })
})

describe('resetPassword', () => {
  it('토큰을 소비해 암호를 바꾸고 모든 세션을 폐기한다', async () => {
    mocks.consumeToken.mockResolvedValue({
      identifier: `reset:${USER.email}`,
      expires: new Date(Date.now() + 60_000),
    })

    await resetPassword({ token: 'token', password: 'New-password-123!' })

    expect(mocks.updatePassword).toHaveBeenCalledWith(USER.id, 'new-hash')
    expect(mocks.deleteSessions).toHaveBeenCalledWith(USER.id)
    expect(mocks.info).toHaveBeenCalledWith(
      { userId: USER.id, revokedSessions: 2 },
      'password reset completed',
    )
  })

  it.each([
    [null, 'token-unknown'],
    [
      {
        identifier: `verify:${USER.email}`,
        expires: new Date(Date.now() + 60_000),
      },
      'token-purpose',
    ],
    [
      { identifier: `reset:${USER.email}`, expires: new Date(Date.now() - 1) },
      'token-expired',
    ],
  ])('잘못된 토큰을 거부한다', async (consumed, _reason) => {
    mocks.consumeToken.mockResolvedValue(consumed)
    await expect(
      resetPassword({ token: 'token', password: 'New-password-123!' }),
    ).rejects.toMatchObject({ code: 'E_VALIDATION' })
  })
})

describe('verifyEmail', () => {
  it('미인증 사용자를 인증하고 이미 인증된 사용자는 그대로 반환한다', async () => {
    mocks.consumeToken.mockResolvedValue({
      identifier: `verify:${USER.email}`,
      expires: new Date(Date.now() + 60_000),
    })
    await expect(verifyEmail({ token: 'token' })).resolves.toMatchObject({
      userId: USER.id,
    })
    expect(mocks.setVerified).toHaveBeenCalledOnce()

    mocks.findEmail.mockResolvedValue({ ...USER, emailVerified: NOW })
    await expect(verifyEmail({ token: 'token' })).resolves.toEqual({
      userId: USER.id,
      emailVerified: NOW.toISOString(),
    })
  })

  it('없는 토큰과 없는 계정을 거부한다', async () => {
    mocks.consumeToken.mockResolvedValueOnce(null)
    await expect(verifyEmail({ token: 'missing' })).rejects.toMatchObject({
      code: 'E_VALIDATION',
    })

    mocks.consumeToken.mockResolvedValue({
      identifier: `verify:${USER.email}`,
      expires: new Date(Date.now() + 60_000),
    })
    mocks.findEmail.mockResolvedValue(null)
    await expect(verifyEmail({ token: 'token' })).rejects.toMatchObject({
      code: 'E_USER_NOT_FOUND',
    })
  })
})
