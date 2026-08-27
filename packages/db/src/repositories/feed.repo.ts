import type { Episode, Page, MemberTier } from '@aidream/core'
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

/** DB-only feed shape. Services turn stored keys into public CDN URLs. */
export interface FeedRow extends Episode {
  readonly creatorId: string
  readonly seriesTitle: string
  readonly seriesSlug: string
  readonly creatorHandle: string
  readonly creatorDisplayName: string
  readonly creatorAvatarKey: string | null
  readonly creatorTier: MemberTier
  readonly creatorVerifiedAt: Date | null
  readonly durationSec: number | null
}

type PrismaFeedRow = PrismaEpisode & {
  creatorId: string
  seriesTitle: string
  seriesSlug: string
  creatorHandle: string
  creatorDisplayName: string
  creatorAvatarKey: string | null
  creatorTier: MemberTier
  creatorVerifiedAt: Date | null
  durationSec: number | null
}

// Production playback QA publishes a temporary episode to exercise the real
// media pipeline. It must never become viewer-facing feed content.
const PRODUCTION_MEDIA_QA_USER_ID = 'media_qa_20260826'

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
  e.visibility,
  e.language,
  e.category_id AS "categoryId",
  e.keywords,
  e.allow_embed AS "allowEmbed",
  e.allow_download AS "allowDownload",
  e.recorded_at AS "recordedAt",
  e.meta_title AS "metaTitle",
  e.meta_description AS "metaDescription",
  e.og_image_key AS "ogImageKey",
  e.canonical_path AS "canonicalPath",
  e.made_for_kids AS "madeForKids",
  e.license,
  e.content_warnings AS "contentWarnings",
  e.regions_allowed AS "regionsAllowed",
  e.regions_blocked AS "regionsBlocked",
  e.ai_models AS "aiModels",
  e.ai_tools AS "aiTools",
  e.ai_human_role AS "aiHumanRole",
  e.ai_generated_pct AS "aiGeneratedPct",
  e.share_count AS "shareCount",
  e.impression_count AS "impressionCount",
  e.avg_watch_sec AS "avgWatchSec",
  e.created_at AS "createdAt",
  e.updated_at AS "updatedAt",
  e.deleted_at AS "deletedAt",
  s.owner_id AS "creatorId",
  s.title AS "seriesTitle",
  s.slug AS "seriesSlug",
  creator.handle AS "creatorHandle",
  creator.display_name AS "creatorDisplayName",
  creator.avatar_key AS "creatorAvatarKey",
  creator.tier AS "creatorTier",
  creator.verified_at AS "creatorVerifiedAt",
  COALESCE(e.duration_sec, asset.duration_sec) AS "durationSec"
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
  rows: PrismaFeedRow[],
  limit: number,
  key: (row: PrismaFeedRow) => string | number,
): Page<FeedRow> {
  const hasNext = rows.length > limit
  const pageRows = hasNext ? rows.slice(0, limit) : rows
  const last = pageRows.at(-1)
  return {
    items: pageRows.map((row) => ({
      ...mapEpisode(row),
      creatorId: row.creatorId,
      seriesTitle: row.seriesTitle,
      seriesSlug: row.seriesSlug,
      creatorHandle: row.creatorHandle,
      creatorDisplayName: row.creatorDisplayName,
      creatorAvatarKey: row.creatorAvatarKey,
      creatorTier: row.creatorTier,
      creatorVerifiedAt: row.creatorVerifiedAt,
      durationSec: row.durationSec,
    })),
    nextCursor:
      hasNext && last !== undefined
        ? encodeCursor({ k: key(last), id: last.id })
        : null,
  }
}

export function listPopularFeed(options: FeedOptions): Promise<Page<FeedRow>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : numericCursor(options.cursor)
    const rows = await db.$queryRaw<PrismaFeedRow[]>(Prisma.sql`
      SELECT ${episodeColumns}
      FROM episode e
      INNER JOIN series s ON s.id = e.series_id
      INNER JOIN "user" creator ON creator.id = s.owner_id
      LEFT JOIN video_asset asset ON asset.id = e.asset_id
      WHERE e.status = 'PUBLISHED'::"EpisodeStatus"
        AND e.deleted_at IS NULL
        AND e.published_at IS NOT NULL
        AND s.deleted_at IS NULL
        AND creator.deleted_at IS NULL
        AND creator.status = 'ACTIVE'::"UserStatus"
        AND creator.id <> ${PRODUCTION_MEDIA_QA_USER_ID}
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

export function listLatestFeed(options: FeedOptions): Promise<Page<FeedRow>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : dateCursor(options.cursor)
    const rows = await db.$queryRaw<PrismaFeedRow[]>(Prisma.sql`
      SELECT ${episodeColumns}
      FROM episode e
      INNER JOIN series s ON s.id = e.series_id
      INNER JOIN "user" creator ON creator.id = s.owner_id
      LEFT JOIN video_asset asset ON asset.id = e.asset_id
      WHERE e.status = 'PUBLISHED'::"EpisodeStatus"
        AND e.deleted_at IS NULL
        AND e.published_at IS NOT NULL
        AND s.deleted_at IS NULL
        AND creator.deleted_at IS NULL
        AND creator.status = 'ACTIVE'::"UserStatus"
        AND creator.id <> ${PRODUCTION_MEDIA_QA_USER_ID}
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
): Promise<Page<FeedRow>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : dateCursor(options.cursor)
    const rows = await db.$queryRaw<PrismaFeedRow[]>(Prisma.sql`
      SELECT ${episodeColumns}
      FROM episode e
      INNER JOIN series s ON s.id = e.series_id
      INNER JOIN "user" creator ON creator.id = s.owner_id
      LEFT JOIN video_asset asset ON asset.id = e.asset_id
      WHERE e.status = 'PUBLISHED'::"EpisodeStatus"
        AND e.deleted_at IS NULL
        AND e.published_at IS NOT NULL
        AND s.deleted_at IS NULL
        AND creator.deleted_at IS NULL
        AND creator.status = 'ACTIVE'::"UserStatus"
        AND creator.id <> ${PRODUCTION_MEDIA_QA_USER_ID}
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

export function listLikedEpisodeIds(
  viewerId: string,
  episodeIds: readonly string[],
): Promise<ReadonlySet<string>> {
  if (episodeIds.length === 0) return Promise.resolve(new Set<string>())

  return executeDb(async () => {
    const rows = await db.like.findMany({
      where: { userId: viewerId, episodeId: { in: [...episodeIds] } },
      select: { episodeId: true },
    })
    return new Set(rows.map((row) => row.episodeId))
  })
}

export function listBlockedCreatorIds(
  viewerId: string,
  creatorIds: readonly string[],
): Promise<ReadonlySet<string>> {
  if (creatorIds.length === 0) return Promise.resolve(new Set<string>())

  return executeDb(async () => {
    const rows = await db.block.findMany({
      where: { blockerId: viewerId, blockedId: { in: [...creatorIds] } },
      select: { blockedId: true },
    })
    return new Set(rows.map((row) => row.blockedId))
  })
}
