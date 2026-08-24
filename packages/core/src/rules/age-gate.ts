import type { AgeRating } from '../enums.js'
import { NotImplementedError } from '../errors/not-implemented.js'

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

export function checkAgeGate(_input: AgeGateInput): AgeGateResult {
  throw new NotImplementedError('T07:checkAgeGate')
}
