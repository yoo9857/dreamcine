import { AppError, type SignPartsInput } from '@aidream/core'
import {
  BUCKET,
  MAX_PARTS_PER_SIGN,
  PRESIGN_PART_TTL_SEC,
  signParts,
} from '@aidream/storage'

import type { RouteSession } from '@/src/auth/types'

import {
  assertNotExpired,
  loadOwnedSession,
  requireS3UploadId,
} from './session-access'

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
 */
export async function signMoreParts(
  session: RouteSession,
  uploadId: string,
  input: SignPartsInput,
): Promise<readonly SignedPartResult[]> {
  const upload = assertNotExpired(await loadOwnedSession(session, uploadId))

  /*
    이 세션에 없는 파트 번호를 서명해 주면 안 된다. S3 는 범위 밖 번호도
    받아들이고, 완료 시점에야 InvalidPart 로 터진다 — 원인에서 먼 실패다.
  */
  const outOfRange = input.partNumbers.filter(
    (partNumber) => partNumber < 1 || partNumber > upload.totalParts,
  )
  if (outOfRange.length > 0) {
    throw new AppError('E_UPLOAD_INVALID_PART', {
      uploadId,
      outOfRange: outOfRange.slice(0, 20),
      totalParts: upload.totalParts,
    })
  }

  const parts = await signParts(
    BUCKET.ORIGINALS,
    upload.objectKey,
    requireS3UploadId(upload),
    input.partNumbers.slice(0, MAX_PARTS_PER_SIGN),
    PRESIGN_PART_TTL_SEC,
  )

  return parts.map((part) => ({
    partNumber: part.partNumber,
    url: part.url,
    expiresAt: part.expiresAt.toISOString(),
  }))
}
