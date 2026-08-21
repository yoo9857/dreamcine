import { describe, it } from 'vitest'

describe('readiness', () => {
  it.todo('세 의존 서비스가 모두 살아있으면 status=ok')
  it.todo('DB 가 죽으면 status=degraded 이고 checks.db=fail')
  it.todo('Redis 가 죽으면 status=degraded 이고 checks.redis=fail')
  it.todo('S3 가 죽으면 status=degraded 이고 checks.storage=fail')
  it.todo('느린 의존 서비스는 2초에 타임아웃 처리된다')
})
