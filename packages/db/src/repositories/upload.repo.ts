import type { UploadSession, UploadStatus } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

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
  _id: string,
): Promise<UploadSession | null> {
  throw new NotImplementedError('T02:findUploadSessionById')
}

export function createUploadSession(
  _input: CreateUploadSessionData,
): Promise<UploadSession> {
  throw new NotImplementedError('T02:createUploadSession')
}

export function updateUploadStatus(
  _id: string,
  _status: UploadStatus,
  _patch?: { s3UploadId?: string | null; errorCode?: string | null },
): Promise<UploadSession> {
  throw new NotImplementedError('T02:updateUploadStatus')
}

export function updateCompletedParts(
  _id: string,
  _parts: CompletedPart[],
): Promise<UploadSession> {
  throw new NotImplementedError('T02:updateCompletedParts')
}
