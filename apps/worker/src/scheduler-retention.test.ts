import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { SCHEDULED_JOB_OPTS } from '@aidream/queue'

const SOURCE = readFileSync(
  fileURLToPath(new URL('./scheduler.ts', import.meta.url)),
  'utf8',
)

/**
 * 반복 잡은 `enqueue()` 를 거치지 않으므로 보존 정책이 자동으로 붙지 않는다.
 * 하나라도 빠지면 그 큐는 완료 기록을 영원히 쌓고, Redis 가 `maxmemory` 에
 * 닿는 순간 `noeviction` 정책이 큐 쓰기를 전부 막는다 — 업로드한 영상의
 * 트랜스코딩이 등록조차 되지 않는다. (2026-09-17 운영 장애)
 *
 * 호출 자리마다 검사가 필요한데 `productionDependencies` 가 내보내지지 않아
 * 주입으로는 확인할 수 없다. 소스를 직접 읽어 누락을 막는다.
 */
describe('반복 잡 보존 정책', () => {
  it('모든 upsertJobScheduler 호출이 보존 정책을 싣는다', () => {
    const calls = SOURCE.split('upsertJobScheduler(').slice(1)
    expect(calls.length).toBeGreaterThan(0)

    const missing = calls.filter((call) => {
      // 다음 호출 전까지가 이 호출의 인자 범위다.
      const body = call.slice(0, call.indexOf('await ') + 1 || call.length)
      return !body.includes('SCHEDULED_JOB_OPTS')
    })

    expect(missing).toEqual([])
  })

  it('보존 정책이 완료와 실패 양쪽을 모두 정리한다', () => {
    expect(SCHEDULED_JOB_OPTS.removeOnComplete).toBeDefined()
    expect(SCHEDULED_JOB_OPTS.removeOnFail).toBeDefined()
  })
})
