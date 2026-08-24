import type { AgeRating } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

export const AGE_VERIFICATION_COOKIE = 'aidream.age'
export const AGE_VERIFICATION_TTL_SEC = 60 * 60

export interface AgeVerificationClaim {
  readonly episodeId: string
  readonly ageRating: AgeRating
  readonly expiresAt: number
}

export interface CreateAgeVerificationCookieInput {
  readonly claim: AgeVerificationClaim
  readonly secret: string
  readonly secure: boolean
}

export interface VerifyAgeVerificationInput {
  readonly cookieHeader: string | null
  readonly episodeId: string
  readonly ageRating: AgeRating
  readonly now: Date
  readonly secret: string
}

export function createAgeVerificationCookie(
  _input: CreateAgeVerificationCookieInput,
): string {
  throw new NotImplementedError('T07:createAgeVerificationCookie')
}

export function verifyAgeVerification(
  _input: VerifyAgeVerificationInput,
): boolean {
  throw new NotImplementedError('T07:verifyAgeVerification')
}
