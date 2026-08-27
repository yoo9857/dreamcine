import type {
  AssetStatus,
  CreatorApplicationStatus,
  EpisodeStatus,
  UserRole,
} from '@prisma/client'

import { db } from '../client.js'
import { decodeCursor, encodeCursor } from '../cursor.js'
import { executeDb } from '../errors.js'

export interface AdminPage<T> {
  readonly items: readonly T[]
  readonly nextCursor: string | null
}

function cursorWhere(cursor: string | undefined):
  | Record<string, never>
  | {
      OR: (
        | { createdAt: { lt: Date } }
        | { createdAt: Date; id: { lt: string } }
      )[]
    } {
  if (cursor === undefined) return {}
  const value = decodeCursor(cursor)
  if (typeof value.k !== 'string') return {}
  const createdAt = new Date(value.k)
  if (Number.isNaN(createdAt.getTime())) return {}
  return {
    OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: value.id } }],
  }
}

function pageResult<T extends { id: string; createdAt: Date }>(
  rows: readonly T[],
  limit: number,
): AdminPage<T> {
  const hasNext = rows.length > limit
  const items = hasNext ? rows.slice(0, limit) : rows
  const last = items.at(-1)
  return {
    items,
    nextCursor:
      hasNext && last !== undefined
        ? encodeCursor({ k: last.createdAt.toISOString(), id: last.id })
        : null,
  }
}

export interface AdminCreatorApplication {
  readonly id: string
  readonly displayName: string
  readonly email: string
  readonly track: string
  readonly portfolioUrl: string
  readonly socialUrl: string | null
  readonly experience: string | null
  readonly pitch: string
  readonly round: string
  readonly status: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

export function listCreatorApplicationsForAdmin(options: {
  limit: number
  cursor?: string
  query?: string
  status?: CreatorApplicationStatus
}): Promise<AdminPage<AdminCreatorApplication>> {
  return executeDb(async () => {
    const rows = await db.creatorApplication.findMany({
      where: {
        AND: [
          cursorWhere(options.cursor),
          options.status === undefined ? {} : { status: options.status },
          options.query === undefined
            ? {}
            : {
                OR: [
                  {
                    displayName: {
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
                ],
              },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    })
    return pageResult(rows, options.limit)
  })
}

export function updateCreatorApplicationStatus(
  id: string,
  status: CreatorApplicationStatus,
): Promise<AdminCreatorApplication> {
  return executeDb(() =>
    db.creatorApplication.update({ where: { id }, data: { status } }),
  )
}

export interface AdminContentItem {
  readonly id: string
  readonly title: string
  readonly status: string
  readonly visibility: string
  readonly viewCount: string
  readonly likeCount: number
  readonly publishedAt: Date | null
  readonly createdAt: Date
  readonly series: {
    readonly title: string
    readonly owner: { readonly handle: string }
  }
  readonly asset: { readonly status: string } | null
}

export function listContentForAdmin(options: {
  limit: number
  cursor?: string
  query?: string
  status?: EpisodeStatus
}): Promise<AdminPage<AdminContentItem>> {
  return executeDb(async () => {
    const rows = await db.episode.findMany({
      where: {
        deletedAt: null,
        AND: [
          cursorWhere(options.cursor),
          options.status === undefined ? {} : { status: options.status },
          options.query === undefined
            ? {}
            : {
                OR: [
                  {
                    title: {
                      contains: options.query,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    series: {
                      title: {
                        contains: options.query,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                ],
              },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
      select: {
        id: true,
        title: true,
        status: true,
        visibility: true,
        viewCount: true,
        likeCount: true,
        publishedAt: true,
        createdAt: true,
        series: {
          select: { title: true, owner: { select: { handle: true } } },
        },
        asset: { select: { status: true } },
      },
    })
    return pageResult(
      rows.map((row) => ({ ...row, viewCount: row.viewCount.toString() })),
      options.limit,
    )
  })
}

export interface AdminAssetItem {
  readonly id: string
  readonly status: string
  readonly fileName: string
  readonly ownerHandle: string
  readonly episodeTitle: string | null
  readonly sizeBytes: string | null
  readonly durationSec: number | null
  readonly attemptCount: number
  readonly errorCode: string | null
  readonly errorDetail: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

export function listAssetsForAdmin(options: {
  limit: number
  cursor?: string
  status?: AssetStatus
}): Promise<AdminPage<AdminAssetItem>> {
  return executeDb(async () => {
    const rows = await db.videoAsset.findMany({
      where: {
        AND: [
          cursorWhere(options.cursor),
          options.status === undefined ? {} : { status: options.status },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
      include: {
        upload: {
          select: { fileName: true, user: { select: { handle: true } } },
        },
        episode: { select: { title: true } },
      },
    })
    return pageResult(
      rows.map((row) => ({
        id: row.id,
        status: row.status,
        fileName: row.upload?.fileName ?? '원본 정보 없음',
        ownerHandle: row.upload?.user.handle ?? 'unknown',
        episodeTitle: row.episode?.title ?? null,
        sizeBytes: row.sizeBytes?.toString() ?? null,
        durationSec: row.durationSec,
        attemptCount: row.attemptCount,
        errorCode: row.errorCode,
        errorDetail: row.errorDetail,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      options.limit,
    )
  })
}

export function setUserRoleForAdmin(input: {
  userId: string
  role: UserRole
  grantedBy: string
  reason: string
}): Promise<void> {
  return executeDb(() =>
    db.$transaction(async (transaction) => {
      const user = await transaction.user.findUniqueOrThrow({
        where: { id: input.userId, deletedAt: null },
        select: { role: true, email: true },
      })
      if (user.role === input.role) return
      await transaction.user.update({
        where: { id: input.userId },
        data: {
          role: input.role,
          roleGrantedAt: new Date(),
          roleGrantedBy: input.grantedBy,
        },
      })
      await transaction.roleGrant.create({
        data: {
          userId: input.userId,
          fromRole: user.role,
          toRole: input.role,
          grantedBy: input.grantedBy,
          reason: input.reason,
        },
      })
      await transaction.authAuditLog.create({
        data: {
          userId: input.userId,
          email: user.email,
          kind: 'ROLE_CHANGED',
          detail: `${user.role} -> ${input.role}: ${input.reason}`,
        },
      })
      await transaction.session.deleteMany({ where: { userId: input.userId } })
    }),
  )
}

export function listRecentRoleGrants(limit = 20) {
  return executeDb(() =>
    db.roleGrant.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      include: {
        user: { select: { handle: true, displayName: true } },
        granter: { select: { handle: true } },
      },
    }),
  )
}
