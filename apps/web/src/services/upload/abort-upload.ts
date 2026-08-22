import { NotImplementedError } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

/**
 * 업로드를 중단하고 S3 의 미완료 파트를 정리한다.
 *
 * **멱등이다.** 이미 중단된 세션에 다시 요청해도 성공으로 본다 — 사용자가
 * 취소 버튼을 두 번 누르는 것은 정상이고, 그때마다 에러를 보여줄 이유가 없다.
 *
 * S3 abort 를 빼먹으면 미완료 파트가 남아 **비용을 계속 발생시킨다.**
 * 정리 잡이 결국 회수하지만, 사용자가 명시적으로 취소한 것은 즉시 지운다.
 */
export function abortUpload(
  _session: RouteSession,
  _uploadId: string,
): Promise<void> {
  throw new NotImplementedError('T05:abortUpload')
}
