import type { UploadSession, UploadStatus } from '@aidream/core'
import { db } from '../client.js'
import { executeDb } from '../errors.js'
import { mapUploadSession } from '../mappers/upload.mapper.js'

export interface CompletedPart {
  partNumber: number
  etag: string
}

export interface CreateUploadSessionData {
  userId: string
  fileName: string
  fileSize: bigint
  mimeType: string
  checksum?: string | null
  objectKey: string
  partSize: number
  totalParts: number
  expiresAt: Date
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
