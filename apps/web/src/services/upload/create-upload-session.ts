import {
  NotImplementedError,
  type CreateUploadInput,
  type CreateUploadResult,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

/**
 * 업로드 세션을 만들고 첫 파트들의 서명 URL 을 발급한다.
 * (T05 §5 `createUploadSession` 순서)
 *
 * 순서에 함정이 하나 있다 — S3 멀티파트 생성(8)과 DB INSERT(9) 사이다.
 *
 *   S3 먼저 → DB 실패:  고아 멀티파트가 남는다. `storage.cleanup` 잡이
 *                       `listStaleMultipartUploads` 로 찾아 회수한다.
 *   DB 먼저 → S3 실패:  s3UploadId 가 없는 세션이 남는다. **회수 대상을
 *                       식별할 수 없다** — 어느 멀티파트가 이 세션의 것인지
 *                       알 방법이 없다.
 *
 * 그래서 S3 를 먼저 한다. 둘 다 고아를 만들 수 있지만, 한쪽만 회수 가능하다.
 */
export function createUploadSession(
  _session: RouteSession,
  _input: CreateUploadInput,
): Promise<CreateUploadResult> {
  throw new NotImplementedError('T05:createUploadSession')
}
