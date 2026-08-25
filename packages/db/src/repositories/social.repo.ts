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

export interface CommentEpisodeContext {
  readonly id: string
  readonly ownerId: string
  readonly status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'HIDDEN' | 'REMOVED'
  readonly commentsOff: boolean
}

export function findCommentEpisodeContext(
  episodeId: string,
): Promise<CommentEpisodeContext | null> {
  return executeDb(async () => {
    const row = await db.episode.findFirst({
      where: { id: episodeId, deletedAt: null },
      select: {
        id: true,
        status: true,
        series: { select: { ownerId: true, commentsOff: true } },
      },
    })
    return row === null
      ? null
      : {
          id: row.id,
          ownerId: row.series.ownerId,
          status: row.status,
          commentsOff: row.series.commentsOff,
        }
  })
}

export function findCommentById(id: string): Promise<Comment | null> {
  return executeDb(async () => {
    const row = await db.comment.findFirst({ where: { id, deletedAt: null } })
    return row === null ? null : mapComment(row)
  })
}

export function getUserSocialState(
  viewerId: string,
  targetId: string,
): Promise<{ isFollowing: boolean; isBlocked: boolean }> {
  return executeDb(async () => {
    const [follow, block] = await Promise.all([
      db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: targetId,
          },
        },
        select: { followerId: true },
      }),
      db.block.findFirst({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: targetId },
            { blockerId: targetId, blockedId: viewerId },
          ],
        },
        select: { blockerId: true },
      }),
    ])
    return { isFollowing: follow !== null, isBlocked: block !== null }
  })
}

export function getEpisodeSocialState(
  episodeId: string,
  viewerId?: string,
): Promise<{ likeCount: number; isLiked: boolean }> {
  return executeDb(async () => {
    const [episode, like] = await Promise.all([
      db.episode.findFirst({
        where: { id: episodeId, status: 'PUBLISHED', deletedAt: null },
        select: { likeCount: true },
      }),
      viewerId === undefined
        ? null
        : db.like.findUnique({
            where: { userId_episodeId: { userId: viewerId, episodeId } },
            select: { userId: true },
          }),
    ])
    if (episode === null) throw new AppError('E_EPISODE_NOT_FOUND')
    return { likeCount: episode.likeCount, isLiked: like !== null }
  })
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
): Promise<{ created: boolean; followerCount: number }> {
  return withTransaction(async (tx) => {
    const created = await tx.follow.createMany({
      data: { followerId, followingId },
      skipDuplicates: true,
    })
    const user = await tx.user.update({
      where: { id: followingId, deletedAt: null },
      data: { followerCount: { increment: created.count } },
      select: { followerCount: true },
    })
    return { created: created.count === 1, followerCount: user.followerCount }
  })
}

export function unfollowUser(
  followerId: string,
  followingId: string,
): Promise<{ removed: boolean; followerCount: number }> {
  return withTransaction(async (tx) => {
    const deleted = await tx.follow.deleteMany({
      where: { followerId, followingId },
    })
    const user = await tx.user.update({
      where: { id: followingId, deletedAt: null },
      data: { followerCount: { decrement: deleted.count } },
      select: { followerCount: true },
    })
    return { removed: deleted.count === 1, followerCount: user.followerCount }
  })
}

export function blockUser(
  blockerId: string,
  blockedId: string,
): Promise<{ created: boolean }> {
  return withTransaction(async (tx) => {
    const created = await tx.block.createMany({
      data: { blockerId, blockedId },
      skipDuplicates: true,
    })
    const outgoing = await tx.follow.deleteMany({
      where: { followerId: blockerId, followingId: blockedId },
    })
    const incoming = await tx.follow.deleteMany({
      where: { followerId: blockedId, followingId: blockerId },
    })
    if (outgoing.count !== 0) {
      await tx.user.update({
        where: { id: blockedId, deletedAt: null },
        data: { followerCount: { decrement: outgoing.count } },
      })
    }
    if (incoming.count !== 0) {
      await tx.user.update({
        where: { id: blockerId, deletedAt: null },
        data: { followerCount: { decrement: incoming.count } },
      })
    }
    return { created: created.count === 1 }
  })
}

export function unblockUser(
  blockerId: string,
  blockedId: string,
): Promise<void> {
  return executeDb(async () => {
    await db.block.deleteMany({ where: { blockerId, blockedId } })
  })
}

export function likeEpisode(
  userId: string,
  episodeId: string,
): Promise<{ created: boolean; likeCount: number }> {
  return withTransaction(async (tx) => {
    const created = await tx.like.createMany({
      data: { userId, episodeId },
      skipDuplicates: true,
    })
    const episode = await tx.episode.update({
      where: { id: episodeId, deletedAt: null },
      data: { likeCount: { increment: created.count } },
      select: { likeCount: true },
    })
    return { created: created.count === 1, likeCount: episode.likeCount }
  })
}

export function unlikeEpisode(
  userId: string,
  episodeId: string,
): Promise<{ removed: boolean; likeCount: number }> {
  return withTransaction(async (tx) => {
    const deleted = await tx.like.deleteMany({ where: { userId, episodeId } })
    const episode = await tx.episode.update({
      where: { id: episodeId, deletedAt: null },
      data: { likeCount: { decrement: deleted.count } },
      select: { likeCount: true },
    })
    return { removed: deleted.count === 1, likeCount: episode.likeCount }
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

export interface CommentThreadRow {
  readonly id: string
  readonly episodeId: string
  readonly parentId: string | null
  readonly body: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly deletedAt: Date | null
  readonly user: {
    readonly handle: string
    readonly displayName: string
    readonly avatarKey: string | null
  }
  readonly replies: readonly Omit<CommentThreadRow, 'replies'>[]
}

export function listCommentThreadsByEpisode(options: {
  readonly episodeId: string
  readonly limit: number
  readonly cursor?: string
}): Promise<Page<CommentThreadRow>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : dateCursor(options.cursor)
    const rows = await db.comment.findMany({
      where: {
        episodeId: options.episodeId,
        parentId: null,
        isHidden: false,
        OR: [{ deletedAt: null }, { replies: { some: { deletedAt: null } } }],
        ...(cursor === null
          ? {}
          : {
              AND: {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                ],
              },
            }),
      },
      include: {
        user: { select: { handle: true, displayName: true, avatarKey: true } },
        replies: {
          where: { deletedAt: null, isHidden: false },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: 3,
          include: {
            user: {
              select: { handle: true, displayName: true, avatarKey: true },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    })
    const hasNext = rows.length > options.limit
    const items = hasNext ? rows.slice(0, options.limit) : rows
    const last = items.at(-1)
    return {
      items,
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

export function updateCommentBody(id: string, body: string): Promise<Comment> {
  return executeDb(async () =>
    mapComment(
      await db.comment.update({
        where: { id, deletedAt: null },
        data: { body },
      }),
    ),
  )
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
