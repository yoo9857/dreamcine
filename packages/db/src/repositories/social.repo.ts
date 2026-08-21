import type { Comment, Notification, Page } from '@aidream/core'
import { AppError } from '@aidream/core'
import { db } from '../client.js'
import { decodeCursor, encodeCursor } from '../cursor.js'
import { executeDb } from '../errors.js'
import { mapComment, mapNotification } from '../mappers/social.mapper.js'
import { withTransaction } from '../tx.js'

export interface CreateCommentData {
  episodeId: string
  userId: string
  parentId?: string | null
  body: string
}

function dateCursor(cursor: string): { createdAt: Date; id: string } {
  const payload = decodeCursor(cursor)
  if (typeof payload.k !== 'string') {
    throw new AppError('E_FEED_INVALID_CURSOR')
  }
  const createdAt = new Date(payload.k)
  if (Number.isNaN(createdAt.getTime())) {
    throw new AppError('E_FEED_INVALID_CURSOR')
  }
  return { createdAt, id: payload.id }
}

export function followUser(
  followerId: string,
  followingId: string,
): Promise<void> {
  return withTransaction(async (tx) => {
    await tx.follow.create({ data: { followerId, followingId } })
    await tx.user.update({
      where: { id: followingId, deletedAt: null },
      data: { followerCount: { increment: 1 } },
    })
  })
}

export function unfollowUser(
  followerId: string,
  followingId: string,
): Promise<void> {
  return withTransaction(async (tx) => {
    const deleted = await tx.follow.deleteMany({
      where: { followerId, followingId },
    })
    if (deleted.count === 1) {
      await tx.user.update({
        where: { id: followingId, deletedAt: null },
        data: { followerCount: { decrement: 1 } },
      })
    }
  })
}

export function blockUser(blockerId: string, blockedId: string): Promise<void> {
  return executeDb(async () => {
    await db.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    })
  })
}

export function likeEpisode(userId: string, episodeId: string): Promise<void> {
  return withTransaction(async (tx) => {
    await tx.like.create({ data: { userId, episodeId } })
    await tx.episode.update({
      where: { id: episodeId, deletedAt: null },
      data: { likeCount: { increment: 1 } },
    })
  })
}

export function unlikeEpisode(
  userId: string,
  episodeId: string,
): Promise<void> {
  return withTransaction(async (tx) => {
    const deleted = await tx.like.deleteMany({ where: { userId, episodeId } })
    if (deleted.count === 1) {
      await tx.episode.update({
        where: { id: episodeId, deletedAt: null },
        data: { likeCount: { decrement: 1 } },
      })
    }
  })
}

export function createComment(input: CreateCommentData): Promise<Comment> {
  return withTransaction(async (tx) => {
    const row = await tx.comment.create({ data: input })
    await tx.episode.update({
      where: { id: input.episodeId, deletedAt: null },
      data: { commentCount: { increment: 1 } },
    })
    return mapComment(row)
  })
}

export function listCommentsByEpisode(options: {
  episodeId: string
  limit: number
  cursor?: string
  includeDeleted?: false
}): Promise<Page<Comment>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : dateCursor(options.cursor)
    const rows = await db.comment.findMany({
      where: {
        episodeId: options.episodeId,
        deletedAt: null,
        ...(cursor === null
          ? {}
          : {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    })
    const hasNext = rows.length > options.limit
    const pageRows = hasNext ? rows.slice(0, options.limit) : rows
    const last = pageRows.at(-1)
    return {
      items: pageRows.map(mapComment),
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({ k: last.createdAt.toISOString(), id: last.id })
          : null,
    }
  })
}

export function softDeleteComment(id: string): Promise<Comment> {
  return withTransaction(async (tx) => {
    const row = await tx.comment.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    await tx.episode.update({
      where: { id: row.episodeId, deletedAt: null },
      data: { commentCount: { decrement: 1 } },
    })
    return mapComment(row)
  })
}

export function listNotifications(options: {
  userId: string
  limit: number
  cursor?: string
}): Promise<Page<Notification>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : dateCursor(options.cursor)
    const rows = await db.notification.findMany({
      where: {
        userId: options.userId,
        ...(cursor === null
          ? {}
          : {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    })
    const hasNext = rows.length > options.limit
    const pageRows = hasNext ? rows.slice(0, options.limit) : rows
    const last = pageRows.at(-1)
    return {
      items: pageRows.map(mapNotification),
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({ k: last.createdAt.toISOString(), id: last.id })
          : null,
    }
  })
}

export function markNotificationRead(
  id: string,
  userId: string,
): Promise<Notification> {
  return executeDb(async () =>
    mapNotification(
      await db.notification.update({
        where: { id, userId },
        data: { readAt: new Date() },
      }),
    ),
  )
}
