import { AppError, LIMITS } from '@aidream/core'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { type BucketKind } from './buckets.js'
import { bucketName, s3 } from './client.js'
import { withS3 } from './errors.js'

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

/**
 * SigV4 서명 URL 의 규격 상한(7일). 넘겨도 SDK 는 조용히 URL 을 만들어 주고,
 * 실패는 **사용자가 그 URL 을 쓸 때** 서명 오류로 나타난다. 여기서 막는다.
 */
export const PRESIGN_MAX_TTL_SEC = 7 * 24 * 60 * 60

export function assertTtl(ttlSec: number): number {
  const valid =
    Number.isInteger(ttlSec) && ttlSec > 0 && ttlSec <= PRESIGN_MAX_TTL_SEC
  if (!valid) {
    throw new AppError('E_INTERNAL', { reason: 'invalid-presign-ttl', ttlSec })
  }
  return ttlSec
}

/**
 * `expiresAt` 을 함께 돌려주는 이유: 클라이언트가 언제 재발급을 받아야 하는지
 * 알아야 한다. URL 문자열만 주면 만료를 추측하게 되고, 추측은 틀린다.
 */
export async function presignGet(
  bucket: BucketKind,
  key: string,
  ttlSec: number,
): Promise<PresignedUrl> {
  const expiresIn = assertTtl(ttlSec)
  const url = await withS3(() =>
    getSignedUrl(
      s3(),
      new GetObjectCommand({ Bucket: bucketName(bucket), Key: key }),
      { expiresIn },
    ),
  )
  return { url, expiresAt: new Date(Date.now() + expiresIn * 1000) }
}
