import type { AgeRating } from '../enums.js'

export interface AgeGateInput {
  readonly rating: AgeRating
  readonly viewer: {
    readonly isAuthenticated: boolean
    readonly birthDate?: Date
  } | null
  readonly confirmed: boolean
  readonly now: Date
}

export type AgeGateResult =
  | { readonly allowed: true }
  | {
      readonly allowed: false
      readonly reason: 'AUTH_REQUIRED' | 'AGE_RESTRICTED' | 'CONFIRM_REQUIRED'
    }

export function checkAgeGate(input: AgeGateInput): AgeGateResult {
  if (input.rating === 'ALL') return { allowed: true }
  if (input.rating === 'A12' || input.rating === 'A15') {
    return input.confirmed
      ? { allowed: true }
      : { allowed: false, reason: 'CONFIRM_REQUIRED' }
  }
  if (input.viewer?.isAuthenticated !== true) {
    return { allowed: false, reason: 'AUTH_REQUIRED' }
  }
  if (!input.confirmed || input.viewer.birthDate === undefined) {
    return { allowed: false, reason: 'CONFIRM_REQUIRED' }
  }
  const nineteenthBirthday = new Date(input.viewer.birthDate)
  nineteenthBirthday.setUTCFullYear(nineteenthBirthday.getUTCFullYear() + 19)
  return input.now >= nineteenthBirthday
    ? { allowed: true }
    : { allowed: false, reason: 'AGE_RESTRICTED' }
}
