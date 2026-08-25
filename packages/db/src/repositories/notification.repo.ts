import {
  AppError,
  NotificationPayloadSchema,
  type Notification,
  type NotificationPayload,
  type Page,
} from '@aidream/core'
import { db } from '../client.js'
import { decodeCursor, encodeCursor } from '../cursor.js'
import { executeDb } from '../errors.js'
import { mapNotification } from '../mappers/social.mapper.js'

export interface CreateNotificationData {
  readonly id?: string
  readonly userId: string
  readonly payload: NotificationPayload
}

export function findNotificationEpisode(episodeId: string): Promise<{
  readonly id: string
  readonly seriesId: string
  readonly ownerId: string
} | null> {
  return executeDb(async () => {
    const row = await db.episode.findFirst({
      where: { id: episodeId, status: 'PUBLISHED', deletedAt: null },
      select: {
        id: true,
        seriesId: true,
        series: { select: { ownerId: true } },
      },
    })
    return row === null
      ? null
      : { id: row.id, seriesId: row.seriesId, ownerId: row.series.ownerId }
  })
}

export function findNotificationEpisodeOwner(
  episodeId: string,
): Promise<string | null> {
  return executeDb(async () => {
    const row = await db.episode.findFirst({
      where: { id: episodeId, deletedAt: null },
      select: { series: { select: { ownerId: true } } },
    })
    return row?.series.ownerId ?? null
  })
}

export function createNotification(
  input: CreateNotificationData,
): Promise<Notification> {
  return executeDb(async () => {
    const payload = NotificationPayloadSchema.parse(input.payload)
    return mapNotification(
      await db.notification.create({
        data: {
          ...(input.id === undefined ? {} : { id: input.id }),
          userId: input.userId,
          type: payload.type,
          payload,
        },
      }),
    )
  })
}

export function createNotifications(
  inputs: readonly CreateNotificationData[],
): Promise<number> {
  return executeDb(async () => {
    const result = await db.notification.createMany({
      data: inputs.map((input) => {
        const payload = NotificationPayloadSchema.parse(input.payload)
        return {
          ...(input.id === undefined ? {} : { id: input.id }),
          userId: input.userId,
          type: payload.type,
          payload,
        }
      }),
      skipDuplicates: true,
    })
    return result.count
  })
}

export function listNotificationsPage(options: {
  readonly userId: string
  readonly limit: number
  readonly cursor?: string
}): Promise<Page<Notification>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : notificationCursor(options.cursor)
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
    const items = hasNext ? rows.slice(0, options.limit) : rows
    const last = items.at(-1)
    return {
      items: items.map(mapNotification),
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({ k: last.createdAt.toISOString(), id: last.id })
          : null,
    }
  })
}

export function markNotificationsReadByIds(
  userId: string,
  ids: readonly string[],
): Promise<number> {
  return executeDb(async () => {
    const result = await db.notification.updateMany({
      where: { userId, id: { in: [...ids] }, readAt: null },
      data: { readAt: new Date() },
    })
    return result.count
  })
}

export function listFollowerIds(options: {
  readonly creatorId: string
  readonly limit: number
  readonly cursor?: string
}): Promise<Page<string>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : notificationCursor(options.cursor)
    const rows = await db.follow.findMany({
      where: {
        followingId: options.creatorId,
        follower: { status: 'ACTIVE', deletedAt: null },
        AND: [
          {
            follower: { blocking: { none: { blockedId: options.creatorId } } },
          },
          {
            follower: { blockedBy: { none: { blockerId: options.creatorId } } },
          },
        ],
        ...(cursor === null
          ? {}
          : {
              OR: [
                { createdAt: { gt: cursor.createdAt } },
                { createdAt: cursor.createdAt, followerId: { gt: cursor.id } },
              ],
            }),
      },
      orderBy: [{ createdAt: 'asc' }, { followerId: 'asc' }],
      take: options.limit + 1,
      select: { followerId: true, createdAt: true },
    })
    const hasNext = rows.length > options.limit
    const items = hasNext ? rows.slice(0, options.limit) : rows
    const last = items.at(-1)
    return {
      items: items.map((row) => row.followerId),
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({
              k: last.createdAt.toISOString(),
              id: last.followerId,
            })
          : null,
    }
  })
}

function notificationCursor(cursor: string): { createdAt: Date; id: string } {
  const payload = decodeCursor(cursor)
  if (typeof payload.k !== 'string') throw new AppError('E_FEED_INVALID_CURSOR')
  const createdAt = new Date(payload.k)
  if (Number.isNaN(createdAt.getTime()))
    throw new AppError('E_FEED_INVALID_CURSOR')
  return { createdAt, id: payload.id }
}
