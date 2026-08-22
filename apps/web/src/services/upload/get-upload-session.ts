import { NotImplementedError, type UploadSessionState } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

/**
 * 재개용 상태 조회.
 *
 * `completedParts` 가 재개의 전부다 — 클라이언트는 이것을 보고 **누락분만**
 * 다시 올린다. 돌려주지 않으면 처음부터 올려야 하고, 그러면 재개라고
 * 부를 수 없다.
 *
 * 완료된 파트 번호는 DB 의 `completedParts` 가 아니라 **S3 의 ListParts** 를
 * 신뢰한다. DB 는 클라이언트가 알려준 것이고, S3 는 실제로 저장된 것이다.
 * 둘이 어긋나면(브라우저가 죽어 보고를 못 한 경우) DB 쪽이 항상 적다.
 */
export function getUploadSession(
  _session: RouteSession,
  _uploadId: string,
): Promise<UploadSessionState> {
  throw new NotImplementedError('T05:getUploadSession')
}
