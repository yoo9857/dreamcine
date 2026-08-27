import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  createToken: vi.fn(),
  findEmail: vi.fn(),
  findHandle: vi.fn(),
  hashPassword: vi.fn(),
  sendVerification: vi.fn(),
}))

vi.mock('@aidream/db', () => ({
  createUser: mocks.createUser,
  createVerificationToken: mocks.createToken,
  findUserByEmail: mocks.findEmail,
  findUserByHandle: mocks.findHandle,
}))

vi.mock('@/src/auth/password', () => ({
  hashPassword: mocks.hashPassword,
}))

vi.mock('@/src/lib/logger', () => ({
  getLogger: () => ({ error: vi.fn() }),
}))

vi.mock('@/src/lib/mail', () => ({
  mailTransportConfigured: () => true,
  sendVerificationMail: mocks.sendVerification,
}))

const { signup } = await import('./signup.js')
const { MARKETING_CONSENT_VERSION, PRIVACY_VERSION, TERMS_VERSION } =
  await import('@/src/lib/policies')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.findEmail.mockResolvedValue(null)
  mocks.findHandle.mockResolvedValue(null)
  mocks.hashPassword.mockResolvedValue('password-hash')
  mocks.createUser.mockResolvedValue({
    id: 'user_1',
    handle: 'creator_01',
    email: 'creator@mail.ilog.info',
  })
  mocks.createToken.mockResolvedValue(undefined)
  mocks.sendVerification.mockResolvedValue(undefined)
})

describe('signup profile persistence', () => {
  it('stores demographics, purpose, country, and consent history', async () => {
    await signup({
      email: 'creator@mail.ilog.info',
      password: 'safe-password-123',
      handle: 'creator_01',
      displayName: 'Creator',
      birthDate: '1995-06-15',
      gender: 'PREFER_NOT_TO_SAY',
      signupPurpose: 'CREATOR',
      country: 'KR',
      acceptTerms: true,
      marketingConsent: false,
    })

    expect(mocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        birthDate: new Date('1995-06-15T00:00:00.000Z'),
        gender: 'PREFER_NOT_TO_SAY',
        signupPurpose: 'CREATOR',
        country: 'KR',
        consents: [
          { kind: 'TOS', version: TERMS_VERSION, granted: true },
          { kind: 'PRIVACY', version: PRIVACY_VERSION, granted: true },
          {
            kind: 'MARKETING',
            version: MARKETING_CONSENT_VERSION,
            granted: false,
          },
        ],
      }),
    )
  })
})
