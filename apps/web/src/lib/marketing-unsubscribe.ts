import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

const ClaimSchema = z.object({
  userId: z.string().min(1),
  expiresAt: z.number().int().positive(),
})

export const MARKETING_UNSUBSCRIBE_TTL_SEC = 90 * 24 * 60 * 60

function signature(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`ilog-marketing-unsubscribe-v1:${payload}`)
    .digest('base64url')
}

export function createMarketingUnsubscribeToken(input: {
  readonly userId: string
  readonly now: Date
  readonly secret: string
}): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId: input.userId,
      expiresAt:
        Math.floor(input.now.getTime() / 1000) + MARKETING_UNSUBSCRIBE_TTL_SEC,
    }),
  ).toString('base64url')
  return `${payload}.${signature(payload, input.secret)}`
}

export function verifyMarketingUnsubscribeToken(input: {
  readonly token: string
  readonly now: Date
  readonly secret: string
}): string | null {
  const separator = input.token.lastIndexOf('.')
  if (separator <= 0) return null
  const payload = input.token.slice(0, separator)
  const actual = Buffer.from(input.token.slice(separator + 1))
  const expected = Buffer.from(signature(payload, input.secret))
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null
  try {
    const parsed = ClaimSchema.safeParse(
      JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as unknown,
    )
    if (
      !parsed.success ||
      parsed.data.expiresAt <= Math.floor(input.now.getTime() / 1000)
    )
      return null
    return parsed.data.userId
  } catch {
    return null
  }
}
