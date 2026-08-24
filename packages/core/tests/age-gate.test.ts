import { describe, expect, it } from 'vitest'

import { checkAgeGate, type AgeGateInput } from '../src/index.js'

const YEAR = 2026

function decide(patch: Partial<AgeGateInput>): ReturnType<typeof checkAgeGate> {
  return checkAgeGate({
    rating: 'ALL',
    viewer: null,
    confirmed: false,
    currentYear: YEAR,
    ...patch,
  })
}

describe('checkAgeGate', () => {
  it('ALL은 로그인과 확인 없이 허용한다', () => {
    expect(decide({ rating: 'ALL' })).toEqual({ allowed: true })
  })

  it.each(['A12', 'A15'] as const)(
    '%s는 명시적 확인 전에는 막고 확인 후 허용한다',
    (rating) => {
      expect(decide({ rating })).toEqual({
        allowed: false,
        reason: 'CONFIRM_REQUIRED',
      })
      expect(decide({ rating, confirmed: true })).toEqual({ allowed: true })
    },
  )

  it('A19는 인증, 확인, 생년을 모두 요구한다', () => {
    expect(decide({ rating: 'A19', confirmed: true })).toEqual({
      allowed: false,
      reason: 'AUTH_REQUIRED',
    })
    expect(
      decide({
        rating: 'A19',
        viewer: { isAuthenticated: true },
        confirmed: false,
      }),
    ).toEqual({ allowed: false, reason: 'CONFIRM_REQUIRED' })
    expect(
      decide({
        rating: 'A19',
        viewer: { isAuthenticated: true },
        confirmed: true,
      }),
    ).toEqual({ allowed: false, reason: 'CONFIRM_REQUIRED' })
  })

  it('A19는 19세 이상만 허용한다', () => {
    const base = {
      rating: 'A19' as const,
      confirmed: true,
      viewer: { isAuthenticated: true, birthYear: YEAR - 19 },
    }
    expect(decide(base)).toEqual({ allowed: true })
    expect(
      decide({ ...base, viewer: { ...base.viewer, birthYear: YEAR - 18 } }),
    ).toEqual({ allowed: false, reason: 'AGE_RESTRICTED' })
  })
})
