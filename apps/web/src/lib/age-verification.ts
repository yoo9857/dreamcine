import { createHmac, timingSafeEqual } from 'node:crypto'

import {
  AgeVerificationClaimSchema,
  type AgeRating,
  type AgeVerificationClaim,
} from '@aidream/core'

export const AGE_VERIFICATION_COOKIE = 'aidream.age'
export const AGE_VERIFICATION_TTL_SEC = 60 * 60

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
  input: CreateAgeVerificationCookieInput,
): string {
  const payload = Buffer.from(JSON.stringify(input.claim)).toString('base64url')
  const signature = sign(payload, input.secret)
  const path = `/api/episodes/${encodeURIComponent(input.claim.episodeId)}/playback`
  return [
    `${AGE_VERIFICATION_COOKIE}=${payload}.${signature}`,
    `Path=${path}`,
    `Max-Age=${String(AGE_VERIFICATION_TTL_SEC)}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(input.secure ? ['Secure'] : []),
  ].join('; ')
}

export function verifyAgeVerification(
  input: VerifyAgeVerificationInput,
): boolean {
  const value = readCookie(input.cookieHeader, AGE_VERIFICATION_COOKIE)
  if (value === null) return false
  const separator = value.lastIndexOf('.')
  if (separator <= 0) return false
  const payload = value.slice(0, separator)
  const signature = value.slice(separator + 1)
  const expected = sign(payload, input.secret)
  const actualBytes = Buffer.from(signature)
  const expectedBytes = Buffer.from(expected)
  if (
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  ) {
    return false
  }
  try {
    const parsed = AgeVerificationClaimSchema.safeParse(
      JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as unknown,
    )
    if (!parsed.success) return false
    return (
      parsed.data.episodeId === input.episodeId &&
      parsed.data.ageRating === input.ageRating &&
      parsed.data.expiresAt > Math.floor(input.now.getTime() / 1000)
    )
  } catch {
    return false
  }
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`aidream-age-v1:${payload}`)
    .digest('base64url')
}

function readCookie(header: string | null, name: string): string | null {
  if (header === null) return null
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    const separator = trimmed.indexOf('=')
    if (separator > 0 && trimmed.slice(0, separator) === name) {
      return trimmed.slice(separator + 1)
    }
  }
  return null
}
