import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

/**
 * DB · Redis · Object Storage 실물을 요구한다. CI 는 dev compose 스택으로
 * 셋을 모두 띄운다. 로컬에 환경변수가 없으면 건너뛴다. (ISS-005)
 */
const hasStack =
  process.env.DATABASE_URL !== undefined &&
  process.env.REDIS_URL !== undefined &&
  process.env.S3_ENDPOINT !== undefined
const skip = !hasStack && process.env.CI === undefined

const originalRedisUrl = process.env.REDIS_URL
const originalBucket = process.env.S3_BUCKET_ORIGINALS

let checkReadiness: typeof import('./ready').checkReadiness
let closeRedis: typeof import('@/src/lib/redis').closeRedis

beforeAll(async () => {
  checkReadiness = (await import('./ready')).checkReadiness
  closeRedis = (await import('@/src/lib/redis')).closeRedis
})

afterAll(() => {
  closeRedis()
})

afterEach(() => {
  // URL 을 바꾸면 새 클라이언트가 생기므로 이전 소켓을 반드시 닫는다.
  closeRedis()
  if (originalRedisUrl !== undefined) {
    process.env.REDIS_URL = originalRedisUrl
  }
  if (originalBucket !== undefined) {
    process.env.S3_BUCKET_ORIGINALS = originalBucket
  }
})

describe.skipIf(skip)('readiness against real dependencies', () => {
  it('세 의존 서비스가 살아있으면 status=ok', async () => {
    await expect(checkReadiness()).resolves.toEqual({
      status: 'ok',
      checks: {
        db: 'ok',
        redis: 'ok',
        storage: 'ok',
        queue: 'ok',
        mail: 'ok',
      },
    })
  })

  it('Redis 를 끄면 degraded 이고 checks.redis=fail', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:1'

    const result = await checkReadiness()
    expect(result.status).toBe('degraded')
    expect(result.checks.redis).toBe('fail')
    expect(result.checks.db).toBe('ok')
  })

  it('버킷이 없으면 degraded 이고 checks.storage=fail', async () => {
    process.env.S3_BUCKET_ORIGINALS = 'bucket-that-does-not-exist-t03'

    const result = await checkReadiness()
    expect(result.status).toBe('degraded')
    expect(result.checks.storage).toBe('fail')
  })

  it('여러 의존 서비스가 동시에 죽어도 각각 보고한다', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:1'
    process.env.S3_BUCKET_ORIGINALS = 'bucket-that-does-not-exist-t03'

    const result = await checkReadiness()
    expect(result.checks.redis).toBe('fail')
    expect(result.checks.storage).toBe('fail')
  })

  it('검사 전체가 타임아웃 상한 안에서 끝난다', async () => {
    process.env.REDIS_URL = 'redis://10.255.255.1:6379'

    const startedAt = Date.now()
    await checkReadiness()
    // 병렬이므로 가장 느린 하나(2초) + 여유 안에서 끝나야 한다.
    expect(Date.now() - startedAt).toBeLessThan(6000)
  }, 15_000)
})
