import type { User } from '@aidream/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { userFixture } from '@/src/test-support/entity-fixtures'

const mocks = vi.hoisted(() => ({
  consumeToken: vi.fn(),
  createToken: vi.fn(),
  deleteSessions: vi.fn(),
  deleteTokens: vi.fn(),
  error: vi.fn(),
  findEmail: vi.fn(),
  hash: vi.fn(),
  info: vi.fn(),
  mailConfigured: vi.fn(),
  sendReset: vi.fn(),
  sendVerification: vi.fn(),
  sendWelcome: vi.fn(),
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
  mailTransportConfigured: mocks.mailConfigured,
  sendPasswordResetMail: mocks.sendReset,
  sendVerificationMail: mocks.sendVerification,
  sendWelcomeMail: mocks.sendWelcome,
}))

const { requestPasswordReset } = await import('./request-password-reset.js')
const { resetPassword } = await import('./reset-password.js')
const { resendVerification } = await import('./resend-verification.js')
const { verifyEmail } = await import('./verify-email.js')

const NOW = new Date('2026-08-24T00:00:00.000Z')
const USER: User = {
  ...userFixture(),
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
  mocks.mailConfigured.mockReset().mockReturnValue(true)
  mocks.sendReset.mockReset().mockResolvedValue(undefined)
  mocks.sendVerification.mockReset().mockResolvedValue(undefined)
  mocks.sendWelcome.mockReset().mockResolvedValue(undefined)
  mocks.setVerified
    .mockReset()
    .mockImplementation((_id: string, at: Date) =>
      Promise.resolve({ ...USER, emailVerified: at }),
    )
  mocks.updatePassword.mockReset().mockResolvedValue(undefined)
})

describe('resendVerification', () => {
  it('기존 인증 토큰을 교체하고 새 인증 메일을 보낸다', async () => {
    await resendVerification({ email: USER.email })

    expect(mocks.deleteTokens).toHaveBeenCalledWith(`verify:${USER.email}`)
    expect(mocks.createToken).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: `verify:${USER.email}` }),
    )
    expect(mocks.sendVerification).toHaveBeenCalledWith(
      expect.objectContaining({ to: USER.email, lang: 'ko' }),
    )
  })

  it('없는 계정과 이미 인증된 계정은 같은 성공 결과로 끝낸다', async () => {
    mocks.findEmail.mockResolvedValueOnce(null)
    await expect(
      resendVerification({ email: 'missing@example.com' }),
    ).resolves.toBeUndefined()

    mocks.findEmail.mockResolvedValueOnce({ ...USER, emailVerified: NOW })
    await expect(
      resendVerification({ email: USER.email }),
    ).resolves.toBeUndefined()

    expect(mocks.createToken).not.toHaveBeenCalled()
    expect(mocks.sendVerification).not.toHaveBeenCalled()
  })
})

describe('requestPasswordReset', () => {
  it('기존 토큰을 지우고 새 토큰 메일을 보낸다', async () => {
    await requestPasswordReset({ email: USER.email })

    expect(mocks.deleteTokens).toHaveBeenCalledWith(`reset:${USER.email}`)
    expect(mocks.createToken).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: `reset:${USER.email}` }),
    )
    expect(mocks.sendReset).toHaveBeenCalledWith(
      expect.objectContaining({ to: USER.email, locale: 'ko' }),
    )
  })

  it('요청 화면의 언어로 비밀번호 재설정 메일을 보낸다', async () => {
    await requestPasswordReset({ email: USER.email, lang: 'en' })

    expect(mocks.sendReset).toHaveBeenCalledWith(
      expect.objectContaining({ to: USER.email, locale: 'en' }),
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
    expect(mocks.sendWelcome).toHaveBeenCalledWith({
      to: USER.email,
      handle: USER.handle,
      locale: 'ko',
    })

    mocks.findEmail.mockResolvedValue({ ...USER, emailVerified: NOW })
    await expect(verifyEmail({ token: 'token' })).resolves.toEqual({
      userId: USER.id,
      emailVerified: NOW.toISOString(),
    })
    expect(mocks.sendWelcome).toHaveBeenCalledOnce()
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
