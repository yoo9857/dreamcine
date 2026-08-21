import type { Episode, Page } from '@aidream/core'
import { AppError } from '@aidream/core'
import { Prisma, type Episode as PrismaEpisode } from '@prisma/client'
import { db } from '../client.js'
import { decodeCursor, encodeCursor } from '../cursor.js'
import { executeDb } from '../errors.js'
import { mapEpisode } from '../mappers/episode.mapper.js'

export interface FeedOptions {
  limit: number
  cursor?: string
  viewerId?: string
}

const episodeColumns = Prisma.raw(`
  e.id,
  e.series_id AS "seriesId",
  e.season_id AS "seasonId",
  e.asset_id AS "assetId",
  e.number,
  e.title,
  e.description,
  e.thumb_key AS "thumbKey",
  e.status,
  e.age_rating AS "ageRating",
  e.ai_disclosure AS "aiDisclosure",
  e.publish_at AS "publishAt",
  e.published_at AS "publishedAt",
  e.view_count AS "viewCount",
  e.like_count AS "likeCount",
  e.comment_count AS "commentCount",
  e.rank_score AS "rankScore",
  e.created_at AS "createdAt",
  e.updated_at AS "updatedAt",
  e.deleted_at AS "deletedAt"
`)

function blockedFilter(viewerId?: string): Prisma.Sql {
  return viewerId === undefined
    ? Prisma.empty
    : Prisma.sql`AND NOT EXISTS (
        SELECT 1 FROM "block" b
        WHERE b.blocker_id = ${viewerId} AND b.blocked_id = s.owner_id
      )`
}

function dateCursor(cursor: string): { key: Date; id: string } {
  const payload = decodeCursor(cursor)
  if (typeof payload.k !== 'string') {
    throw new AppError('E_FEED_INVALID_CURSOR')
  }
  const key = new Date(payload.k)
  if (Number.isNaN(key.getTime())) {
    throw new AppError('E_FEED_INVALID_CURSOR')
  }
  return { key, id: payload.id }
}

function numericCursor(cursor: string): { key: number; id: string } {
  const payload = decodeCursor(cursor)
  if (typeof payload.k !== 'number') {
    throw new AppError('E_FEED_INVALID_CURSOR')
  }
  return { key: payload.k, id: payload.id }
}

function toPage(
  rows: PrismaEpisode[],
  limit: number,
  key: (row: PrismaEpisode) => string | number,
): Page<Episode> {
  const hasNext = rows.length > limit
  const pageRows = hasNext ? rows.slice(0, limit) : rows
  const last = pageRows.at(-1)
  return {
    items: pageRows.map(mapEpisode),
    nextCursor:
      hasNext && last !== undefined
        ? encodeCursor({ k: key(last), id: last.id })
        : null,
  }
}

export function listPopularFeed(options: FeedOptions): Promise<Page<Episode>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : numericCursor(options.cursor)
    const rows = await db.$queryRaw<PrismaEpisode[]>(Prisma.sql`
      SELECT ${episodeColumns}
      FROM episode e
      INNER JOIN series s ON s.id = e.series_id
      WHERE e.status = 'PUBLISHED'::"EpisodeStatus"
        AND e.deleted_at IS NULL
        AND s.deleted_at IS NULL
        ${blockedFilter(options.viewerId)}
        ${
          cursor === null
            ? Prisma.empty
            : Prisma.sql`AND (e.rank_score, e.id) < (${cursor.key}, ${cursor.id})`
        }
      ORDER BY e.rank_score DESC, e.id DESC
      LIMIT ${options.limit + 1}
    `)
    return toPage(rows, options.limit, (row) => row.rankScore)
  })
}

export function listLatestFeed(options: FeedOptions): Promise<Page<Episode>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : dateCursor(options.cursor)
    const rows = await db.$queryRaw<PrismaEpisode[]>(Prisma.sql`
      SELECT ${episodeColumns}
      FROM episode e
      INNER JOIN series s ON s.id = e.series_id
      WHERE e.status = 'PUBLISHED'::"EpisodeStatus"
        AND e.deleted_at IS NULL
        AND e.published_at IS NOT NULL
        AND s.deleted_at IS NULL
        ${blockedFilter(options.viewerId)}
        ${
          cursor === null
            ? Prisma.empty
            : Prisma.sql`AND (e.published_at, e.id) < (${cursor.key}, ${cursor.id})`
        }
      ORDER BY e.published_at DESC, e.id DESC
      LIMIT ${options.limit + 1}
    `)
    return toPage(rows, options.limit, (row) => {
      if (row.publishedAt === null) {
        throw new AppError('E_INTERNAL', {
          reason: 'published feed row has no date',
        })
      }
      return row.publishedAt.toISOString()
    })
  })
}

export function listFollowingFeed(
  viewerId: string,
  options: Omit<FeedOptions, 'viewerId'>,
): Promise<Page<Episode>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : dateCursor(options.cursor)
    const rows = await db.$queryRaw<PrismaEpisode[]>(Prisma.sql`
      SELECT ${episodeColumns}
      FROM episode e
      INNER JOIN series s ON s.id = e.series_id
      WHERE e.status = 'PUBLISHED'::"EpisodeStatus"
        AND e.deleted_at IS NULL
        AND e.published_at IS NOT NULL
        AND s.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM follow f
          WHERE f.follower_id = ${viewerId} AND f.following_id = s.owner_id
        )
        ${blockedFilter(viewerId)}
        ${
          cursor === null
            ? Prisma.empty
            : Prisma.sql`AND (e.published_at, e.id) < (${cursor.key}, ${cursor.id})`
        }
      ORDER BY e.published_at DESC, e.id DESC
      LIMIT ${options.limit + 1}
    `)
    return toPage(rows, options.limit, (row) => {
      if (row.publishedAt === null) {
        throw new AppError('E_INTERNAL', {
          reason: 'published feed row has no date',
        })
      }
      return row.publishedAt.toISOString()
    })
  })
}
