import type { UploadSession as PrismaUploadSession } from '@prisma/client'
import type { UploadSession } from '@aidream/core'

export function mapUploadSession(row: PrismaUploadSession): UploadSession {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    fileName: row.fileName,
    fileSize: row.fileSize.toString(),
    mimeType: row.mimeType,
    checksum: row.checksum,
    objectKey: row.objectKey,
    s3UploadId: row.s3UploadId,
    partSize: row.partSize,
    totalParts: row.totalParts,
    completedParts: row.completedParts,
    errorCode: row.errorCode,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
