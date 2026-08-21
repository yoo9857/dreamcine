import { getLogger } from '../lib/logger'
import { getRedis } from '../lib/redis'

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

export function rateLimitKey(
  rule: RateLimitRule,
  identity: string,
  nowMs: number,
): string {
  const windowStart = Math.floor(nowMs / 1000 / rule.windowSec) * rule.windowSec
  return `rl:${rule.bucket}:${identity}:${String(windowStart)}`
}

/**
 * Redis 고정 윈도우 카운터. 슬라이딩보다 단순함을 의도적으로 선택했다.
 * (07_AUTH_SECURITY.md §8)
 *
 * **Redis 장애 시 통과시킨다(fail-open).** 레이트리밋 때문에 로그인이 전면
 * 불가능해지는 것이 더 심각하다. 장애는 warn 로그와 알럿으로 인지한다.
 */
export async function checkRateLimit(
  rule: RateLimitRule,
  identity: string,
): Promise<RateLimitDecision> {
  const nowMs = Date.now()
  const key = rateLimitKey(rule, identity, nowMs)

  try {
    const redis = getRedis()
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, rule.windowSec)
    }
    if (count > rule.limit) {
      const elapsed = Math.floor(nowMs / 1000) % rule.windowSec
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.max(1, rule.windowSec - elapsed),
      }
    }
    return {
      allowed: true,
      remaining: rule.limit - count,
      retryAfterSec: 0,
    }
  } catch (error: unknown) {
    getLogger().warn(
      { err: error, bucket: rule.bucket },
      'rate limit unavailable, failing open',
    )
    return { allowed: true, remaining: rule.limit, retryAfterSec: 0 }
  }
}
