import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * 실제 Redis 를 요구한다. CI 는 `infra/compose/docker-compose.dev.yml` 로
 * Redis 를 띄우므로 항상 실행된다. 로컬에 REDIS_URL 이 없으면 건너뛴다.
 * CI 에서 REDIS_URL 이 비어 있으면 **건너뛰지 않고 실패한다** — 조용히 통과하는
 * 통합 테스트는 하네스를 무력화한다. (ISS-005)
 */
const hasRedis = process.env.REDIS_URL !== undefined
const runningInCi = process.env.CI !== undefined
const skip = !hasRedis && !runningInCi

const originalRedisUrl = process.env.REDIS_URL

let checkRateLimit: typeof import('./rate-limit').checkRateLimit
let rateLimitKey: typeof import('./rate-limit').rateLimitKey
let getRedis: typeof import('../lib/redis').getRedis

beforeAll(async () => {
  process.env.REDIS_URL ??= 'redis://127.0.0.1:6379'
  const module = await import('./rate-limit')
  checkRateLimit = module.checkRateLimit
  rateLimitKey = module.rateLimitKey
  getRedis = (await import('../lib/redis')).getRedis
})

afterAll(() => {
  if (originalRedisUrl === undefined) {
    delete process.env.REDIS_URL
  } else {
    process.env.REDIS_URL = originalRedisUrl
  }
})

describe.skipIf(skip)('rate limit against real Redis', () => {
  it('한도까지 통과하고 그 다음부터 거절한다', async () => {
    const rule = { bucket: `t03-${randomUUID()}`, limit: 2, windowSec: 60 }

    await expect(checkRateLimit(rule, 'ip')).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
    })
    await expect(checkRateLimit(rule, 'ip')).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    })
    const denied = await checkRateLimit(rule, 'ip')
    expect(denied.allowed).toBe(false)
    expect(denied.retryAfterSec).toBeGreaterThan(0)
  })

  it('신원이 다르면 카운터가 분리된다', async () => {
    const rule = { bucket: `t03-${randomUUID()}`, limit: 1, windowSec: 60 }

    await expect(checkRateLimit(rule, 'ip-a')).resolves.toMatchObject({
      allowed: true,
    })
    await expect(checkRateLimit(rule, 'ip-b')).resolves.toMatchObject({
      allowed: true,
    })
    await expect(checkRateLimit(rule, 'ip-a')).resolves.toMatchObject({
      allowed: false,
    })
  })

  it('윈도우 첫 요청에 TTL 이 설정된다', async () => {
    const rule = { bucket: `t03-${randomUUID()}`, limit: 5, windowSec: 120 }
    const before = Date.now()
    await checkRateLimit(rule, 'ip')

    // 같은 윈도우 안이라면 키가 같다. 윈도우 경계를 넘었을 수 있으니 양쪽을 본다.
    const candidates = [
      rateLimitKey(rule, 'ip', before),
      rateLimitKey(rule, 'ip', Date.now()),
    ]
    const ttls = await Promise.all(
      [...new Set(candidates)].map((key) => getRedis().ttl(key)),
    )
    const live = ttls.filter((ttl) => ttl > 0)
    expect(live.length).toBeGreaterThan(0)
    expect(Math.max(...live)).toBeLessThanOrEqual(rule.windowSec)
  })

  it('PING 이 응답한다', async () => {
    await expect(getRedis().ping()).resolves.toBeUndefined()
  })

  it('Redis 가 없는 주소면 통과시킨다 (fail-open)', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:1'
    try {
      const rule = { bucket: `t03-${randomUUID()}`, limit: 1, windowSec: 60 }
      await expect(checkRateLimit(rule, 'ip')).resolves.toMatchObject({
        allowed: true,
      })
    } finally {
      process.env.REDIS_URL = originalRedisUrl ?? 'redis://127.0.0.1:6379'
    }
  })
})
