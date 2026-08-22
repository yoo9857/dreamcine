import { LIMITS, NotImplementedError } from '@aidream/core'

import type { BucketKind } from './buckets.js'

export interface PresignedUrl {
  readonly url: string
  readonly expiresAt: Date
}

/**
 * 원본 다운로드는 **워커만** 한다. 원본은 사용자에게 절대 노출하지 않는다.
 * (07_AUTH_SECURITY.md §4)
 */
export const PRESIGN_GET_ORIGINAL_TTL_SEC = 15 * 60

/** 파트 PUT URL 유효기간. 대용량 업로드 시간을 확보한다. */
export const PRESIGN_PART_TTL_SEC = LIMITS.PART_URL_TTL_H * 60 * 60

export function presignGet(
  _bucket: BucketKind,
  _key: string,
  _ttlSec: number,
): Promise<PresignedUrl> {
  throw new NotImplementedError('T04:presignGet')
}
