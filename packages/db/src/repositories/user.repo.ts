import {
  AppError,
  type Page,
  type User,
  type UserRole,
  type UserStatus,
} from '@aidream/core'
import { db } from '../client.js'
import { decodeCursor, encodeCursor } from '../cursor.js'
import { executeDb } from '../errors.js'
import { mapUser } from '../mappers/user.mapper.js'

export interface CreateUserData {
  handle: string
  email: string
  displayName: string
  passwordHash?: string | null
  role?: UserRole
}

export interface UpdateUserData {
  displayName?: string
  bio?: string | null
  avatarKey?: string | null
  status?: UserStatus
}

export function findUserById(id: string): Promise<User | null> {
  return executeDb(async () => {
    const row = await db.user.findFirst({ where: { id, deletedAt: null } })
    return row === null ? null : mapUser(row)
  })
}

export function findUserByEmail(email: string): Promise<User | null> {
  return executeDb(async () => {
    const row = await db.user.findFirst({ where: { email, deletedAt: null } })
    return row === null ? null : mapUser(row)
  })
}

export function findUserByHandle(handle: string): Promise<User | null> {
  return executeDb(async () => {
    const row = await db.user.findFirst({ where: { handle, deletedAt: null } })
    return row === null ? null : mapUser(row)
  })
}

export function listRelatedCreators(
  userId: string,
  limit: number,
): Promise<readonly User[]> {
  return executeDb(async () => {
    const rows = await db.user.findMany({
      where: {
        id: { not: userId },
        deletedAt: null,
        status: 'ACTIVE',
        series: {
          some: {
            deletedAt: null,
            episodes: { some: { status: 'PUBLISHED', deletedAt: null } },
          },
        },
      },
      orderBy: [{ followerCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })
    return rows.map(mapUser)
  })
}

export function listUsersForAdmin(options: {
  limit: number
  cursor?: string
  query?: string
}): Promise<Page<User>> {
  return executeDb(async () => {
    let cursor: { createdAt: Date; id: string } | null = null
    if (options.cursor !== undefined) {
      const payload = decodeCursor(options.cursor)
      if (typeof payload.k !== 'string')
        throw new AppError('E_FEED_INVALID_CURSOR')
      const createdAt = new Date(payload.k)
      if (Number.isNaN(createdAt.getTime()))
        throw new AppError('E_FEED_INVALID_CURSOR')
      cursor = { createdAt, id: payload.id }
    }
    const rows = await db.user.findMany({
      where: {
        deletedAt: null,
        AND: [
          options.query === undefined
            ? {}
            : {
                OR: [
                  {
                    handle: {
                      contains: options.query,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    email: {
                      contains: options.query,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    displayName: {
                      contains: options.query,
                      mode: 'insensitive' as const,
                    },
                  },
                ],
              },
          cursor === null
            ? {}
            : {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                ],
              },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    })
    const hasNext = rows.length > options.limit
    const pageRows = hasNext ? rows.slice(0, options.limit) : rows
    const last = pageRows.at(-1)
    return {
      items: pageRows.map(mapUser),
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({ k: last.createdAt.toISOString(), id: last.id })
          : null,
    }
  })
}

export function createUser(input: CreateUserData): Promise<User> {
  return executeDb(async () =>
    mapUser(
      await db.user.create({
        data: input,
      }),
    ),
  )
}

export function updateUser(id: string, input: UpdateUserData): Promise<User> {
  return executeDb(async () =>
    mapUser(
      await db.user.update({
        where: { id, deletedAt: null },
        data: input,
      }),
    ),
  )
}

export function setUserModerationStatus(
  userId: string,
  status: UserStatus,
): Promise<void> {
  return executeDb(async () => {
    await db.$transaction(async (transaction) => {
      await transaction.user.update({ where: { id: userId }, data: { status } })
      if (status !== 'SUSPENDED') return

      await transaction.session.deleteMany({ where: { userId } })
      await transaction.episode.updateMany({
        where: { series: { ownerId: userId }, status: { not: 'REMOVED' } },
        data: { status: 'HIDDEN' },
      })
      await transaction.uploadSession.updateMany({
        where: { userId, status: { in: ['CREATED', 'UPLOADING'] } },
        data: { status: 'ABORTED' },
      })
    })
  })
}

export function incrementUserFollowerCount(
  id: string,
  by: 1 | -1,
): Promise<User> {
  return executeDb(async () =>
    mapUser(
      await db.user.update({
        where: { id, deletedAt: null },
        data: { followerCount: { increment: by } },
      }),
    ),
  )
}

export function incrementUserSeriesCount(
  id: string,
  by: 1 | -1,
): Promise<User> {
  return executeDb(async () =>
    mapUser(
      await db.user.update({
        where: { id, deletedAt: null },
        data: { seriesCount: { increment: by } },
      }),
    ),
  )
}
