import { AppError } from '@aidream/core'
import { db } from '../client.js'
import { executeDb } from '../errors.js'
import { withTransaction } from '../tx.js'

export interface VerifiedImageData {
  ownerId: string
  objectKey: string
  contentType: string
  sizeBytes: bigint
  sha256: string
  width?: number
  height?: number
}

// Call only after successful storage writes and server-side validation.
export function attachSeriesPoster(seriesId: string, image: VerifiedImageData) {
  return withTransaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM series WHERE id = ${seriesId} FOR UPDATE`
    const series = await tx.series.findFirst({
      where: {
        id: seriesId,
        deletedAt: null,
        ownerId: image.ownerId,
        owner: { status: 'ACTIVE', deletedAt: null },
      },
    })
    if (series === null) throw new AppError('E_PERM_NOT_OWNER')
    await tx.storedImage.create({
      data: { ...image, purpose: 'SERIES_POSTER', verifiedAt: new Date() },
    })
    await tx.series.update({
      where: { id: seriesId },
      data: { posterKey: image.objectKey },
    })
    if (series.posterKey !== null)
      await tx.storedImage.updateMany({
        where: { ownerId: image.ownerId, objectKey: series.posterKey },
        data: { status: 'RETIRED' },
      })
    return { previousKey: series.posterKey }
  })
}

export function findOwnedAvatar(ownerId: string, objectKey: string) {
  return executeDb(() =>
    db.storedImage.findFirst({
      where: {
        ownerId,
        objectKey,
        purpose: 'AVATAR',
        status: 'READY',
        verifiedAt: { not: null },
      },
    }),
  )
}

export function getDataIntegritySnapshot() {
  return executeDb(async () => {
    const [
      uploadedWithoutAssets,
      publishedWithoutReadyAssets,
      readyImages,
      missingImages,
      pendingMedia,
      suspended,
      warnings,
    ] = await Promise.all([
      db.uploadSession.findMany({
        where: { status: 'UPLOADED', asset: null },
        select: { id: true, userId: true, objectKey: true, updatedAt: true },
        take: 50,
        orderBy: { updatedAt: 'asc' },
      }),
      db.episode.count({
        where: {
          deletedAt: null,
          status: 'PUBLISHED',
          OR: [{ asset: null }, { asset: { status: { not: 'READY' } } }],
        },
      }),
      db.storedImage.count({ where: { status: 'READY' } }),
      db.storedImage.count({ where: { status: 'MISSING' } }),
      db.moderationAction.count({
        where: {
          mediaQueuedAt: null,
          NOT: { pendingMediaIds: { isEmpty: true } },
        },
      }),
      db.user.count({ where: { status: 'SUSPENDED', deletedAt: null } }),
      db.moderationAction.count({
        where: { action: { in: ['WARNING', 'WARN_USER'] } },
      }),
    ])
    return {
      uploadedWithoutAssets,
      publishedWithoutReadyAssets,
      readyImages,
      missingImages,
      pendingMedia,
      suspended,
      warnings,
    }
  })
}
