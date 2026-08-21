import { describe, it } from 'vitest'

describe('rate limit (Redis)', () => {
  it.todo('한도 안에서는 allowed=true 이고 remaining 이 감소한다')
  it.todo('한도를 초과하면 allowed=false 이고 retryAfterSec 가 양수다')
  it.todo('윈도우 첫 요청에만 EXPIRE 를 설정한다')
  it.todo('Redis 가 없으면 통과시킨다 (fail-open)')
})
