import { AppError, type UploadSession } from '@aidream/core'
import { findUploadSessionById } from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'

/**
 * 세션을 찾고 소유자인지 본다.
 *
 * 네 개의 유스케이스가 모두 이것으로 시작한다. 각자 확인하게 두면 하나가
 * 빠지는 날이 오고, 그 하나로 남의 업로드에 파트를 밀어 넣을 수 있게 된다.
 *
 * 없는 세션과 남의 세션을 **다른 코드로** 구분한다. 같은 코드로 뭉개면
 * 사용자가 무엇을 잘못했는지 알 수 없고, 반대로 구분하면 세션 id 의 존재
 * 여부가 새어나간다 — id 는 UUID 라 열거할 수 없으므로 후자를 택했다.
 */
export async function loadOwnedSession(
  session: RouteSession,
  uploadId: string,
): Promise<UploadSession> {
  const found = await findUploadSessionById(uploadId)
  if (found === null) {
    throw new AppError('E_UPLOAD_SESSION_NOT_FOUND', { uploadId })
  }
  if (found.userId !== session.userId) {
    throw new AppError('E_PERM_NOT_OWNER', { uploadId })
  }
  return found
}

/** 만료됐는지 본다. 만료된 세션에 파트를 더 올려도 완료할 수 없다. */
export function assertNotExpired(session: UploadSession): UploadSession {
  if (session.expiresAt.getTime() <= Date.now()) {
    throw new AppError('E_UPLOAD_SESSION_EXPIRED', {
      uploadId: session.id,
      expiresAt: session.expiresAt.toISOString(),
    })
  }
  return session
}

/**
 * S3 멀티파트 id 를 꺼낸다.
 *
 * 스키마상 nullable 이라 매번 좁혀야 한다. 없다는 것은 세션 생성이 도중에
 * 깨졌다는 뜻이고, 그 세션으로는 아무것도 할 수 없다.
 */
export function requireS3UploadId(session: UploadSession): string {
  const { s3UploadId } = session
  if (s3UploadId === null || s3UploadId === '') {
    throw new AppError('E_UPLOAD_SESSION_NOT_FOUND', {
      uploadId: session.id,
      reason: 'missing-s3-upload-id',
    })
  }
  return s3UploadId
}
