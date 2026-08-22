import {
  NotImplementedError,
  type CompleteUploadInput,
  type CompleteUploadResult,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

/**
 * 멀티파트를 완료하고 자산을 만든 뒤 트랜스코드 잡을 발행한다.
 * (T05 §5 `completeUpload` 순서)
 *
 * **멱등성이 핵심이다.** 네트워크 재시도로 완료가 두 번 호출되는 일은 실제로
 * 자주 일어난다. 그때 자산이 두 개 생기면 트랜스코드 비용이 두 배가 된다.
 * 이미 `UPLOADED` 면 연결된 자산을 찾아 **같은 결과를 돌려준다** — 다시
 * 처리하지 않는다. (T05 §7 ★)
 *
 * 두 곳에서 깨질 수 있고 각각 다른 곳이 수습한다.
 *
 *   7(트랜잭션) 후 8(발행) 실패:
 *     자산이 PENDING 으로 남는다. 완료 자체는 **성공 처리**한다 —
 *     사용자에게 실패라고 말하면 다시 올리게 되고 그게 더 나쁘다.
 *     T06 의 복구 잡이 "10분 넘게 PENDING 인 자산" 을 다시 발행한다.
 *
 *   S3 완료 후 크기 조회(HeadObject) 실패:
 *     storage 계층이 던지지만 업로드는 이미 끝나 있다. 재시도하면
 *     uploadId 가 사라져 410 이 된다 — 성공한 업로드가 "세션 만료" 로
 *     끝난다. 그래서 410 을 받으면 **객체 존재를 먼저 확인**하고, 있으면
 *     멱등 처리한다. (OBS-015)
 */
export function completeUpload(
  _session: RouteSession,
  _uploadId: string,
  _input: CompleteUploadInput,
): Promise<CompleteUploadResult> {
  throw new NotImplementedError('T05:completeUpload')
}
