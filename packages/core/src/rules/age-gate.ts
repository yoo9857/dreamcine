import type { AgeRating } from '../enums.js'

export interface AgeGateInput {
  readonly rating: AgeRating
  readonly viewer: {
    readonly isAuthenticated: boolean
    readonly birthYear?: number
  } | null
  readonly confirmed: boolean
  readonly currentYear: number
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
  if (!input.confirmed || input.viewer.birthYear === undefined) {
    return { allowed: false, reason: 'CONFIRM_REQUIRED' }
  }
  return input.currentYear - input.viewer.birthYear >= 19
    ? { allowed: true }
    : { allowed: false, reason: 'AGE_RESTRICTED' }
}
