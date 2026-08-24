import { describe, expect, it } from 'vitest'

import {
  AGE_VERIFICATION_COOKIE,
  createAgeVerificationCookie,
  verifyAgeVerification,
} from './age-verification.js'

const SECRET = 'age-secret-that-is-at-least-thirty-two-bytes'
const NOW = new Date('2026-08-24T00:00:00.000Z')
const EXPIRES = Math.floor(NOW.getTime() / 1000) + 3600

function cookie(secure = true): string {
  return createAgeVerificationCookie({
    claim: { episodeId: 'ep_1', ageRating: 'A19', expiresAt: EXPIRES },
    secret: SECRET,
    secure,
  })
}

function header(value = cookie()): string {
  return value.split(';')[0] ?? ''
}

describe('age verification cookie', () => {
  it('에피소드 경로로 제한된 보안 쿠키를 발급하고 검증한다', () => {
    const value = cookie()
    expect(value).toContain(`${AGE_VERIFICATION_COOKIE}=`)
    expect(value).toContain('Path=/api/episodes/ep_1/playback')
    expect(value).toContain('Max-Age=3600')
    expect(value).toContain('HttpOnly')
    expect(value).toContain('SameSite=Lax')
    expect(value).toContain('Secure')
    expect(
      verifyAgeVerification({
        cookieHeader: header(value),
        episodeId: 'ep_1',
        ageRating: 'A19',
        now: NOW,
        secret: SECRET,
      }),
    ).toBe(true)
  })

  it('개발 쿠키에는 Secure를 붙이지 않는다', () => {
    expect(cookie(false)).not.toContain('; Secure')
  })

  it('변조·만료·다른 에피소드·등급을 모두 거부한다', () => {
    const base = {
      cookieHeader: header(),
      episodeId: 'ep_1',
      ageRating: 'A19' as const,
      now: NOW,
      secret: SECRET,
    }
    expect(
      verifyAgeVerification({ ...base, cookieHeader: `${header()}x` }),
    ).toBe(false)
    expect(
      verifyAgeVerification({ ...base, now: new Date((EXPIRES + 1) * 1000) }),
    ).toBe(false)
    expect(verifyAgeVerification({ ...base, episodeId: 'ep_2' })).toBe(false)
    expect(verifyAgeVerification({ ...base, ageRating: 'A15' })).toBe(false)
    expect(verifyAgeVerification({ ...base, cookieHeader: null })).toBe(false)
  })
})
