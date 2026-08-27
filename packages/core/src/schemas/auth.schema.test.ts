import { describe, expect, it } from 'vitest'

import { SignupSchema } from './auth.schema.js'

const validSignup = {
  email: 'viewer@mail.ilog.info',
  password: 'safe-password-123',
  handle: 'viewer_01',
  displayName: 'Viewer',
  birthDate: '1995-06-15',
  gender: 'PREFER_NOT_TO_SAY',
  signupPurpose: 'VIEWER',
  country: 'KR',
  acceptTerms: true,
  marketingConsent: false,
}

describe('SignupSchema', () => {
  it('accepts the profile survey fields', () => {
    expect(SignupSchema.safeParse(validSignup).success).toBe(true)
  })

  it('rejects documentation-only email domains that cannot receive mail', () => {
    expect(
      SignupSchema.safeParse({ ...validSignup, email: 'you@example.com' })
        .success,
    ).toBe(false)
  })

  it('rejects future and implausibly old birth dates', () => {
    expect(
      SignupSchema.safeParse({ ...validSignup, birthDate: '2999-01-01' })
        .success,
    ).toBe(false)
    expect(
      SignupSchema.safeParse({ ...validSignup, birthDate: '1800-01-01' })
        .success,
    ).toBe(false)
  })
})
