import { NotImplementedError } from '@aidream/core'

export type DependencyState = 'ok' | 'fail'

export interface ReadyChecks {
  db: DependencyState
  redis: DependencyState
  storage: DependencyState
}

export interface ReadyResult {
  status: 'ok' | 'degraded'
  checks: ReadyChecks
}

/** 의존 서비스 검사 타임아웃. 하나가 느려도 2초 안에 판정한다. */
export const READY_TIMEOUT_MS = 2000

/** DB `select 1` · Redis `PING` · S3 `HeadBucket` 을 병렬로 확인한다. */
export function checkReadiness(): Promise<ReadyResult> {
  throw new NotImplementedError('T03:readyCheck')
}
