import { NotImplementedError } from '@aidream/core'

export interface RateLimitRule {
  bucket: string
  limit: number
  windowSec: number
}

export interface RateLimitDecision {
  allowed: boolean
  remaining: number
  retryAfterSec: number
}

/**
 * Redis 고정 윈도우 카운터. 키는 `rl:{bucket}:{identity}:{windowStart}` 형태다.
 *
 * **Redis 장애 시 통과시킨다(fail-open).** 레이트리밋 때문에 서비스가 죽는 것이
 * 더 나쁘다. (07_AUTH_SECURITY.md §8)
 */
export function checkRateLimit(
  _rule: RateLimitRule,
  _identity: string,
): Promise<RateLimitDecision> {
  throw new NotImplementedError('T03:rateLimit')
}
