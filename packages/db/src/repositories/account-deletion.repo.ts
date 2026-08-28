import { AppError } from '@aidream/core'

import { db } from '../client.js'
import { executeDb } from '../errors.js'

const DELETION_GRACE_MS = 30 * 24 * 60 * 60 * 1000

export interface AccountPurgeManifest {
  readonly userId: string
  readonly email: string
  readonly assetIds: readonly string[]
  readonly multipartUploads: readonly {
    objectKey: string
    s3UploadId: string
  }[]
  readonly objectKeys: readonly string[]
}

export interface AccountDeletionResult {
  readonly scheduledPurgeAt: Date
}

export const ACCOUNT_DELETION_CANCEL_TOKEN_PREFIX = 'delete-cancel:'

export function requestAccountDeletion(input: {
  readonly userId: string
  readonly reason?: string
  readonly now: Date
}): Promise<AccountDeletionResult> {
  return executeDb(async () =>
    db.$transaction(async (transaction) => {
      const user = await transaction.user.findFirst({
        where: { id: input.userId, status: 'ACTIVE', deletedAt: null },
        select: { id: true, role: true },
      })
      if (user === null) throw new AppError('E_USER_NOT_FOUND')

      if (user.role === 'ADMIN') {
        const activeAdmins = await transaction.user.count({
          where: { role: 'ADMIN', status: 'ACTIVE', deletedAt: null },
        })
        if (activeAdmins <= 1) {
          throw new AppError('E_PERM_DENIED', { reason: 'last-admin' })
        }
      }

      const scheduledPurgeAt = new Date(input.now.getTime() + DELETION_GRACE_MS)
      await transaction.userDeletionRequest.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          reason: input.reason ?? null,
          requestedAt: input.now,
          scheduledPurgeAt,
          status: 'PENDING',
        },
        update: {
          reason: input.reason ?? null,
          requestedAt: input.now,
          scheduledPurgeAt,
          status: 'PENDING',
          cancelledAt: null,
          purgedAt: null,
        },
      })
      await transaction.episode.updateMany({
        where: {
          deletedAt: null,
          series: { ownerId: input.userId },
        },
        data: { deletedAt: input.now },
      })
      await transaction.series.updateMany({
        where: { ownerId: input.userId, deletedAt: null },
        data: { deletedAt: input.now },
      })
      await transaction.uploadSession.updateMany({
        where: {
          userId: input.userId,
          status: { in: ['CREATED', 'UPLOADING', 'UPLOADED'] },
        },
        data: { status: 'ABORTED' },
      })
      await transaction.session.deleteMany({ where: { userId: input.userId } })
      await transaction.user.update({
        where: { id: input.userId },
        data: { status: 'DELETED', deletedAt: input.now },
      })
      return { scheduledPurgeAt }
    }),
  )
}

/**
 * One-time recovery link for the 30-day deletion grace period.
 * Restoration is intentionally scoped to rows stamped by the deletion request,
 * so content that was already deleted remains deleted.
 */
export function cancelAccountDeletion(
  token: string,
  now: Date,
): Promise<{ userId: string } | null> {
  return executeDb(async () =>
    db.$transaction(async (transaction) => {
      const verification = await transaction.verificationToken.findUnique({
        where: { token },
      })
      if (
        verification === null ||
        verification.expires <= now ||
        !verification.identifier.startsWith(
          ACCOUNT_DELETION_CANCEL_TOKEN_PREFIX,
        )
      ) {
        return null
      }

      const userId = verification.identifier.slice(
        ACCOUNT_DELETION_CANCEL_TOKEN_PREFIX.length,
      )
      if (userId === '') return null

      const request = await transaction.userDeletionRequest.findUnique({
        where: { userId },
        select: {
          requestedAt: true,
          scheduledPurgeAt: true,
          status: true,
        },
      })
      if (
        request === null ||
        request.status !== 'PENDING' ||
        request.scheduledPurgeAt <= now
      ) {
        return null
      }

      const restored = await transaction.user.updateMany({
        where: {
          id: userId,
          status: 'DELETED',
          deletedAt: request.requestedAt,
        },
        data: { status: 'ACTIVE', deletedAt: null },
      })
      if (restored.count !== 1) return null

      await transaction.series.updateMany({
        where: { ownerId: userId, deletedAt: request.requestedAt },
        data: { deletedAt: null },
      })
      await transaction.episode.updateMany({
        where: {
          deletedAt: request.requestedAt,
          series: { ownerId: userId },
        },
        data: { deletedAt: null },
      })
      await transaction.userDeletionRequest.update({
        where: { userId },
        data: { status: 'CANCELLED', cancelledAt: now },
      })
      await transaction.verificationToken.delete({ where: { token } })
      return { userId }
    }),
  )
}

export function listDueAccountDeletionIds(
  now: Date,
  limit = 100,
): Promise<readonly string[]> {
  return executeDb(async () => {
    const rows = await db.userDeletionRequest.findMany({
      where: { status: 'PENDING', scheduledPurgeAt: { lte: now } },
      orderBy: { scheduledPurgeAt: 'asc' },
      take: limit,
      select: { userId: true },
    })
    return rows.map((row) => row.userId)
  })
}

export function findAccountPurgeManifest(
  userId: string,
  now: Date,
): Promise<AccountPurgeManifest | null> {
  return executeDb(async () => {
    const user = await db.user.findUnique({
      where: {
        id: userId,
        deletionRequest: {
          is: { status: 'PENDING', scheduledPurgeAt: { lte: now } },
        },
      },
      select: {
        id: true,
        email: true,
        avatarKey: true,
        bannerKey: true,
        uploadSessions: {
          select: {
            objectKey: true,
            s3UploadId: true,
            asset: { select: { id: true, originalKey: true, posterKey: true } },
          },
        },
        series: {
          select: {
            posterKey: true,
            bannerKey: true,
            ogImageKey: true,
            episodes: {
              select: {
                thumbKey: true,
                ogImageKey: true,
                subtitles: { select: { objectKey: true } },
                asset: {
                  select: { id: true, originalKey: true, posterKey: true },
                },
              },
            },
          },
        },
      },
    })
    if (user === null) return null

    const assetIds = new Set<string>()
    const objectKeys = new Set<string>()
    const multipartUploads: { objectKey: string; s3UploadId: string }[] = []
    const addKey = (key: string | null): void => {
      if (key !== null && key !== '') objectKeys.add(key)
    }
    addKey(user.avatarKey)
    addKey(user.bannerKey)
    for (const upload of user.uploadSessions) {
      addKey(upload.objectKey)
      if (upload.s3UploadId !== null) {
        multipartUploads.push({
          objectKey: upload.objectKey,
          s3UploadId: upload.s3UploadId,
        })
      }
      if (upload.asset !== null) {
        assetIds.add(upload.asset.id)
        addKey(upload.asset.originalKey)
        addKey(upload.asset.posterKey)
      }
    }
    for (const series of user.series) {
      addKey(series.posterKey)
      addKey(series.bannerKey)
      addKey(series.ogImageKey)
      for (const episode of series.episodes) {
        addKey(episode.thumbKey)
        addKey(episode.ogImageKey)
        for (const subtitle of episode.subtitles) addKey(subtitle.objectKey)
        if (episode.asset !== null) {
          assetIds.add(episode.asset.id)
          addKey(episode.asset.originalKey)
          addKey(episode.asset.posterKey)
        }
      }
    }
    return {
      userId: user.id,
      email: user.email,
      assetIds: [...assetIds],
      multipartUploads,
      objectKeys: [...objectKeys],
    }
  })
}

export function purgeAccountDatabase(
  manifest: AccountPurgeManifest,
): Promise<void> {
  return executeDb(async () => {
    await db.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        DELETE FROM notification
        WHERE payload->>'actorId' = ${manifest.userId}
           OR payload->>'episodeId' IN (
             SELECT e.id FROM episode e JOIN series s ON s.id = e.series_id
             WHERE s.owner_id = ${manifest.userId}
           )
           OR payload->>'seriesId' IN (
             SELECT id FROM series WHERE owner_id = ${manifest.userId}
           )
           OR payload->>'commentId' IN (
             SELECT id FROM comment WHERE user_id = ${manifest.userId}
           )
           OR payload->>'assetId' IN (
             SELECT va.id FROM video_asset va
             LEFT JOIN upload_session us ON us.id = va.upload_id
             LEFT JOIN episode e ON e.asset_id = va.id
             LEFT JOIN series s ON s.id = e.series_id
             WHERE us.user_id = ${manifest.userId} OR s.owner_id = ${manifest.userId}
           )
      `
      await transaction.$executeRaw`
        DELETE FROM report
        WHERE target_id = ${manifest.userId}
           OR target_id IN (SELECT id FROM series WHERE owner_id = ${manifest.userId})
           OR target_id IN (
             SELECT e.id FROM episode e JOIN series s ON s.id = e.series_id
             WHERE s.owner_id = ${manifest.userId}
           )
           OR target_id IN (SELECT id FROM comment WHERE user_id = ${manifest.userId})
      `
      await transaction.$executeRaw`
        UPDATE comment SET parent_id = NULL
        WHERE user_id <> ${manifest.userId}
          AND parent_id IN (SELECT id FROM comment WHERE user_id = ${manifest.userId})
      `
      await transaction.credit.updateMany({
        where: { userId: manifest.userId },
        data: { userId: null, name: '탈퇴한 사용자', note: null },
      })
      await transaction.user.updateMany({
        where: { roleGrantedBy: manifest.userId },
        data: { roleGrantedBy: null },
      })
      await transaction.report.updateMany({
        where: { handledBy: manifest.userId },
        data: { handledBy: null },
      })
      await transaction.authAuditLog.deleteMany({
        where: { OR: [{ userId: manifest.userId }, { email: manifest.email }] },
      })
      await transaction.verificationToken.deleteMany({
        where: {
          identifier: {
            in: [
              manifest.email,
              `verify:${manifest.email}`,
              `reset:${manifest.email}`,
              `${ACCOUNT_DELETION_CANCEL_TOKEN_PREFIX}${manifest.userId}`,
            ],
          },
        },
      })
      await transaction.creatorApplication.deleteMany({
        where: { email: manifest.email },
      })
      await transaction.user.deleteMany({ where: { id: manifest.userId } })
      if (manifest.assetIds.length > 0) {
        await transaction.videoAsset.deleteMany({
          where: { id: { in: [...manifest.assetIds] } },
        })
      }
    })
  })
}
