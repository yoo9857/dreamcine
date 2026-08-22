import { randomUUID } from 'node:crypto'

import {
  AppError,
  LIMITS,
  assertUploadAllowed,
  can,
  decidePartSize,
  loadCapacity,
  ServerEnvSchema,
  type CreateUploadInput,
  type CreateUploadResult,
} from '@aidream/core'
import { createUploadSession as insertUploadSession } from '@aidream/db'
import {
  BUCKET,
  MAX_PARTS_PER_SIGN,
  PRESIGN_PART_TTL_SEC,
  createMultipart,
  originalKey,
  signParts,
} from '@aidream/storage'

import type { RouteSession } from '@/src/auth/types'

import { assertDailyQuota } from './quota'

/**
 * 업로드 세션을 만들고 첫 파트들의 서명 URL 을 발급한다.
 * (T05 §5 `createUploadSession` 순서)
 *
 * 순서에 함정이 하나 있다 — S3 멀티파트 생성과 DB INSERT 사이다.
 *
 *   S3 먼저 → DB 실패:  고아 멀티파트가 남는다. `storage.cleanup` 잡이
 *                       `listStaleMultipartUploads` 로 버킷을 훑어 회수한다.
 *   DB 먼저 → S3 실패:  s3UploadId 가 없는 세션이 남고, 그 세션이 가리키는
 *                       멀티파트가 있는지조차 알 수 없다.
 *
 * S3 를 먼저 한다. 둘 다 고아를 만들 수 있지만 한쪽만 회수 가능하다.
 *
 * 세션 id 를 **여기서 만든다.** 객체 키가 `originals/{userId}/{sessionId}/…`
 * 라서(06 §1, 변경 금지) INSERT 전에 id 가 있어야 키를 만들 수 있다.
 */
export async function createUploadSession(
  session: RouteSession,
  input: CreateUploadInput,
): Promise<CreateUploadResult> {
  const actor = {
    id: session.userId,
    role: session.user.role,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
  }

  /*
    1. 이메일 인증을 **먼저** 본다.

    T05 §5 는 can() → emailVerified 순서로 적고 있지만, can() 자체가 미인증을
    E_PERM_DENIED 로 거부한다(07_AUTH_SECURITY §3). 그 순서로 두면 두 번째
    검사에 영원히 도달하지 못하고, 메일만 인증하면 되는 사용자가 "권한이
    없습니다" 를 보게 된다 — 할 수 있는 일이 없는 문구다.

    08_UIUX_SPEC §10 은 "다음 행동을 제시한다" 를 요구한다. 두 문구는 다음
    행동이 다르므로 도달 가능해야 한다. 테스트가 이 순서를 고정한다.
  */
  if (!session.user.emailVerified) {
    throw new AppError('E_AUTH_EMAIL_NOT_VERIFIED')
  }

  // 2. 역할·상태
  if (!can(actor, 'upload.create')) {
    throw new AppError('E_PERM_DENIED', { action: 'upload.create' })
  }

  const capacity = loadCapacity(
    ServerEnvSchema.shape.CAPACITY_TIER.parse(process.env.CAPACITY_TIER),
  )

  // 3. 시간당 횟수는 라우트의 레이트리밋이 본다 (withRoute).
  // 4. 일일 총량
  await assertDailyQuota(session.userId, input.fileSize, capacity)

  // 5. 용량·형식
  assertUploadAllowed(input, capacity)

  // 6. 파트 계획
  const { partSize, totalParts } = decidePartSize(input.fileSize)

  // 7. 키 — 새니타이즈는 originalKey 안에서 일어난다.
  const uploadId = randomUUID()
  const objectKey = originalKey(session.userId, uploadId, input.fileName)

  // 8. S3 멀티파트
  const multipart = await createMultipart(
    BUCKET.ORIGINALS,
    objectKey,
    input.mimeType,
  )

  // 9. 세션 INSERT
  const expiresAt = new Date(
    Date.now() + LIMITS.UPLOAD_SESSION_TTL_H * 60 * 60 * 1000,
  )
  await insertUploadSession({
    id: uploadId,
    userId: session.userId,
    fileName: input.fileName,
    fileSize: BigInt(input.fileSize),
    mimeType: input.mimeType,
    checksum: input.checksum ?? null,
    objectKey,
    partSize,
    totalParts,
    expiresAt,
    s3UploadId: multipart.uploadId,
  })

  // 10. 첫 배치 서명 — 나머지는 `/parts` 로 추가 발급한다.
  const firstBatch = Array.from(
    { length: Math.min(totalParts, MAX_PARTS_PER_SIGN) },
    (_, index) => index + 1,
  )
  const parts = await signParts(
    BUCKET.ORIGINALS,
    objectKey,
    multipart.uploadId,
    firstBatch,
    PRESIGN_PART_TTL_SEC,
  )

  return {
    uploadId,
    partSize,
    totalParts,
    parts: parts.map((part) => ({
      partNumber: part.partNumber,
      url: part.url,
      expiresAt: part.expiresAt.toISOString(),
    })),
    expiresAt: expiresAt.toISOString(),
  }
}
