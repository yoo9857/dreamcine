import { NotImplementedError, type SignPartsInput } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export interface SignedPartResult {
  readonly partNumber: number
  readonly url: string
  readonly expiresAt: string
}

/**
 * 만료된 파트 URL 을 다시 발급한다.
 *
 * 대용량 업로드는 6시간을 넘길 수 있고, 그때 클라이언트는 403 을 만난다.
 * 그것을 사용자에게 보여주지 않고 조용히 재발급받아 계속하는 것이
 * 08_UIUX_SPEC.md §4 가 요구하는 동작이다.
 *
 * **소유자 확인이 먼저다.** 남의 uploadId 로 서명을 받아내면 그 사람의
 * 업로드에 내 데이터를 밀어 넣을 수 있다.
 */
export function signMoreParts(
  _session: RouteSession,
  _uploadId: string,
  _input: SignPartsInput,
): Promise<readonly SignedPartResult[]> {
  throw new NotImplementedError('T05:signMoreParts')
}
