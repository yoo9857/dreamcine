import { AppError } from '@aidream/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  ping: vi.fn(),
  getRedis: vi.fn(),
  warn: vi.fn(),
}))

vi.mock('../lib/redis', () => ({ getRedis: mocks.getRedis }))
vi.mock('../lib/logger', () => ({
  getLogger: () => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: mocks.warn,
    error: vi.fn(),
  }),
}))

const { checkRateLimit, rateLimitKey } = await import('./rate-limit')

const RULE = { bucket: 'auth', limit: 3, windowSec: 600 }

beforeEach(() => {
  vi.useRealTimers()
  mocks.incr.mockReset()
  mocks.expire.mockReset()
  mocks.warn.mockReset()
  mocks.getRedis.mockReset()
  mocks.expire.mockResolvedValue(undefined)
  mocks.getRedis.mockReturnValue({
    incr: mocks.incr,
    expire: mocks.expire,
    ttl: mocks.ttl,
    ping: mocks.ping,
  })
})

describe('rateLimitKey', () => {
  it('윈도우 시작 시각으로 키를 나눈다', () => {
    // 1_699_999_800_000ms 는 600초 윈도우의 시작점에 정렬된 시각이다.
    const first = rateLimitKey(RULE, '1.2.3.4', 1_699_999_800_000)
    const sameWindow = rateLimitKey(RULE, '1.2.3.4', 1_700_000_399_000)
    const nextWindow = rateLimitKey(RULE, '1.2.3.4', 1_700_000_400_000)

    expect(first).toBe(sameWindow)
    expect(first).not.toBe(nextWindow)
  })

  it('bucket 과 신원이 키에 들어간다', () => {
    expect(rateLimitKey(RULE, 'user_1', 0)).toBe('rl:auth:user_1:0')
  })
})

describe('checkRateLimit', () => {
  it('한도 안이면 통과하고 remaining 이 줄어든다', async () => {
    mocks.incr.mockResolvedValue(1)

    await expect(checkRateLimit(RULE, 'ip')).resolves.toEqual({
      allowed: true,
      remaining: 2,
      retryAfterSec: 0,
    })
  })

  it('윈도우 첫 요청에만 EXPIRE 를 설정한다', async () => {
    mocks.incr.mockResolvedValue(1)
    await checkRateLimit(RULE, 'ip')
    expect(mocks.expire).toHaveBeenCalledWith(expect.any(String), 600)

    mocks.expire.mockClear()
    mocks.incr.mockResolvedValue(2)
    await checkRateLimit(RULE, 'ip')
    expect(mocks.expire).not.toHaveBeenCalled()
  })

  it('한도와 같은 횟수는 아직 통과한다', async () => {
    mocks.incr.mockResolvedValue(3)

    await expect(checkRateLimit(RULE, 'ip')).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    })
  })

  it('한도를 넘으면 거절하고 retryAfterSec 이 양수다', async () => {
    mocks.incr.mockResolvedValue(4)

    const decision = await checkRateLimit(RULE, 'ip')
    expect(decision.allowed).toBe(false)
    expect(decision.remaining).toBe(0)
    expect(decision.retryAfterSec).toBeGreaterThan(0)
    expect(decision.retryAfterSec).toBeLessThanOrEqual(RULE.windowSec)
  })

  it('Redis 가 죽으면 통과시킨다 (fail-open)', async () => {
    mocks.getRedis.mockImplementation(() => {
      throw new AppError('E_QUEUE_UNAVAILABLE', { reason: 'missing-url' })
    })

    await expect(checkRateLimit(RULE, 'ip')).resolves.toEqual({
      allowed: true,
      remaining: RULE.limit,
      retryAfterSec: 0,
    })
    expect(mocks.warn).toHaveBeenCalledTimes(1)
  })

  it('INCR 이 실패해도 통과시킨다', async () => {
    mocks.incr.mockRejectedValue(new AppError('E_QUEUE_UNAVAILABLE'))

    await expect(checkRateLimit(RULE, 'ip')).resolves.toMatchObject({
      allowed: true,
    })
    expect(mocks.warn).toHaveBeenCalledTimes(1)
  })

  it('EXPIRE 실패도 요청을 막지 않는다', async () => {
    mocks.incr.mockResolvedValue(1)
    mocks.expire.mockRejectedValue(new AppError('E_QUEUE_UNAVAILABLE'))

    await expect(checkRateLimit(RULE, 'ip')).resolves.toMatchObject({
      allowed: true,
    })
  })
})
