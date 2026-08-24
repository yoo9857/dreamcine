import type { UploadSession, UploadStatus } from '@aidream/core'
import { db } from '../client.js'
import { executeDb } from '../errors.js'
import { mapUploadSession } from '../mappers/upload.mapper.js'

export interface CompletedPart {
  partNumber: number
  etag: string
}

export interface CreateUploadSessionData {
  /**
   * 호출자가 정한다. 객체 키가 `originals/{userId}/{sessionId}/…` 라
   * (06_MEDIA_PIPELINE.md §1, 변경 금지) **INSERT 전에 id 를 알아야** 키를
   * 만들 수 있다. DB 가 만들게 두면 키를 나중에 고쳐 써야 하고, 그 사이에
   * 죽으면 실제 저장 위치와 다른 키가 남는다.
   */
  id: string
  userId: string
  fileName: string
  fileSize: bigint
  mimeType: string
  checksum?: string | null
  objectKey: string
  partSize: number
  totalParts: number
  expiresAt: Date
  /** S3 멀티파트를 먼저 만들고 그 id 를 함께 넣는다. (T05 §5) */
  s3UploadId?: string | null
}

export function findUploadSessionById(
  id: string,
): Promise<UploadSession | null> {
  return executeDb(async () => {
    const row = await db.uploadSession.findUnique({ where: { id } })
    return row === null ? null : mapUploadSession(row)
  })
}

export function createUploadSession(
  input: CreateUploadSessionData,
): Promise<UploadSession> {
  return executeDb(async () =>
    mapUploadSession(await db.uploadSession.create({ data: input })),
  )
}

export function updateUploadStatus(
  id: string,
  status: UploadStatus,
  patch: { s3UploadId?: string | null; errorCode?: string | null } = {},
): Promise<UploadSession> {
  return executeDb(async () =>
    mapUploadSession(
      await db.uploadSession.update({
        where: { id },
        data: { status, ...patch },
      }),
    ),
  )
}

export function updateCompletedParts(
  id: string,
  parts: CompletedPart[],
): Promise<UploadSession> {
  const completedParts = parts.map((part) => ({
    partNumber: part.partNumber,
    etag: part.etag,
  }))
  return executeDb(async () =>
    mapUploadSession(
      await db.uploadSession.update({
        where: { id },
        data: { completedParts },
      }),
    ),
  )
}

/**
 * 최근 창 안에서 이 사용자가 올린(또는 올리는 중인) 바이트 합.
 * 일일 총량 판정이 쓴다. (06_MEDIA_PIPELINE.md §2)
 *
 * **중단·실패한 세션은 세지 않는다.** 목적은 비용 상한이고, 취소한 업로드까지
 * 신고 용량 전부로 계산하면 실수로 한 번 취소한 사용자가 하루를 못 쓴다.
 * 대신 진행 중(CREATED/UPLOADING)인 것은 센다 — 동시에 여러 개를 시작해
 * 상한을 우회하는 것을 막아야 한다.
 */
export function sumUploadBytesSince(
  userId: string,
  since: Date,
): Promise<bigint> {
  return executeDb(async () => {
    const rows = await db.uploadSession.findMany({
      where: {
        userId,
        createdAt: { gte: since },
        status: { in: ['CREATED', 'UPLOADING', 'UPLOADED'] },
      },
      select: { fileSize: true },
    })
    return rows.reduce((total, row) => total + row.fileSize, 0n)
  })
}

export function listExpiredUploadSessions(
  now: Date,
  limit = 1000,
): Promise<UploadSession[]> {
  return executeDb(async () =>
    (
      await db.uploadSession.findMany({
        where: {
          status: { in: ['CREATED', 'UPLOADING'] },
          expiresAt: { lt: now },
        },
        orderBy: { expiresAt: 'asc' },
        take: limit,
      })
    ).map(mapUploadSession),
  )
}
