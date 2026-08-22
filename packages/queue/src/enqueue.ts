import { NotImplementedError } from '@aidream/core'
import type { Queue } from 'bullmq'

import type { DefinedQueue, JobPayload } from './jobs.js'

export interface EnqueueOptions {
  /**
   * 중복 발행을 막는 열쇠.
   *
   * BullMQ 는 같은 `jobId` 의 잡을 두 번 담지 않는다. 완료 요청이 네트워크
   * 재시도로 두 번 들어와도 트랜스코드는 한 번만 돈다 — 이것이 없으면
   * 같은 영상을 두 번 인코딩하고 비용이 두 배가 된다. (T05 §7 ★)
   */
  readonly jobId?: string
  /** 지연 발행 (ms). 예약 공개·복구 잡이 쓴다. */
  readonly delayMs?: number
  readonly attempts?: number
}

/**
 * 큐 하나를 얻는다. 연결은 재사용한다 — 발행할 때마다 새로 열면 Redis
 * 커넥션이 요청 수만큼 쌓인다.
 */
export function getQueue(_name: DefinedQueue): Queue {
  throw new NotImplementedError('T05:enqueue')
}

/**
 * 타입 안전 발행.
 *
 * 페이로드는 **발행 시점에 검증한다.** 잘못된 모양이 큐에 들어가면 실패가
 * 워커 쪽에서, 그것도 몇 초 뒤에 나타난다 — 원인에서 먼 곳이다. 여기서 막으면
 * 호출한 자리에서 바로 드러난다.
 */
export function enqueue<Q extends DefinedQueue>(
  _name: Q,
  _payload: JobPayload<Q>,
  _options?: EnqueueOptions,
): Promise<void> {
  throw new NotImplementedError('T05:enqueue')
}

/** 테스트와 종료 처리를 위해 열린 커넥션을 닫는다. */
export function closeQueues(): Promise<void> {
  throw new NotImplementedError('T05:enqueue')
}
