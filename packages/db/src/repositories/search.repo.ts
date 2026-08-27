import type {
  AgeRating,
  ContentLicense,
  MemberTier,
  Page,
  TrendingTag,
  Visibility,
} from '@aidream/core'
import { AppError } from '@aidream/core'
import { Prisma } from '@prisma/client'

import { db } from '../client.js'
import { decodeCursor, encodeCursor } from '../cursor.js'
import { executeDb } from '../errors.js'
import type { FeedRow } from './feed.repo.js'

export interface SearchRepositoryOptions {
  readonly limit: number
  readonly cursor?: string
  readonly viewerId?: string
}

export interface SeriesSearchRow {
  readonly type: 'series'
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly posterKey: string | null
  readonly creatorId: string
  readonly creatorHandle: string
  readonly creatorDisplayName: string
  readonly creatorAvatarKey: string | null
  readonly creatorTier: MemberTier
  readonly creatorVerifiedAt: Date | null
}

export interface EpisodeSearchRow {
  readonly type: 'episode'
  readonly episode: FeedRow
}

export interface UserSearchRow {
  readonly type: 'user'
  readonly id: string
  readonly handle: string
  readonly displayName: string
  readonly avatarKey: string | null
  readonly followerCount: number
  readonly tier: MemberTier
  readonly verifiedAt: Date | null
}

export type SearchCatalogRow =
  | SeriesSearchRow
  | EpisodeSearchRow
  | UserSearchRow

interface ScoredRow {
  readonly id: string
  readonly searchScore: number
}

interface SeriesRawRow extends ScoredRow {
  readonly title: string
  readonly slug: string
  readonly posterKey: string | null
  readonly creatorId: string
  readonly creatorHandle: string
  readonly creatorDisplayName: string
  readonly creatorAvatarKey: string | null
  readonly creatorTier: MemberTier
  readonly creatorVerifiedAt: Date | null
}

interface UserRawRow extends ScoredRow {
  readonly handle: string
  readonly displayName: string
  readonly avatarKey: string | null
  readonly followerCount: number
  readonly tier: MemberTier
  readonly verifiedAt: Date | null
}

interface EpisodeRawRow extends ScoredRow {
  readonly seriesId: string
  readonly seasonId: string | null
  readonly assetId: string | null
  readonly number: number
  readonly title: string
  readonly description: string | null
  readonly thumbKey: string | null
  readonly status: 'PUBLISHED'
  readonly ageRating: AgeRating
  readonly visibility: Visibility
  readonly language: string
  readonly categoryId: string | null
  readonly keywords: readonly string[]
  readonly allowEmbed: boolean
  readonly allowDownload: boolean
  readonly recordedAt: Date | null
  readonly metaTitle: string | null
  readonly metaDescription: string | null
  readonly ogImageKey: string | null
  readonly canonicalPath: string | null
  readonly madeForKids: boolean
  readonly license: ContentLicense
  readonly contentWarnings: readonly string[]
  readonly regionsAllowed: readonly string[]
  readonly regionsBlocked: readonly string[]
  readonly aiDisclosure: string | null
  readonly aiModels: readonly string[]
  readonly aiTools: readonly string[]
  readonly aiHumanRole: string | null
  readonly aiGeneratedPct: number | null
  readonly publishAt: Date | null
  readonly publishedAt: Date
  readonly viewCount: bigint
  readonly likeCount: number
  readonly commentCount: number
  readonly shareCount: number
  readonly impressionCount: bigint
  readonly avgWatchSec: number
  readonly rankScore: number
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly deletedAt: null
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

function escapeLike(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
}

function scoreCursor(cursor: string): { score: number; id: string } {
  const payload = decodeCursor(cursor)
  if (typeof payload.k !== 'number') throw new AppError('E_FEED_INVALID_CURSOR')
  return { score: payload.k, id: payload.id }
}

function dateCursor(cursor: string): { publishedAt: Date; id: string } {
  const payload = decodeCursor(cursor)
  if (typeof payload.k !== 'string') throw new AppError('E_FEED_INVALID_CURSOR')
  const publishedAt = new Date(payload.k)
  if (Number.isNaN(publishedAt.getTime()))
    throw new AppError('E_FEED_INVALID_CURSOR')
  return { publishedAt, id: payload.id }
}

function searchPage<T extends ScoredRow>(rows: T[], limit: number): Page<T> {
  const hasNext = rows.length > limit
  const items = hasNext ? rows.slice(0, limit) : rows
  const last = items.at(-1)
  return {
    items,
    nextCursor:
      hasNext && last !== undefined
        ? encodeCursor({ k: last.searchScore, id: last.id })
        : null,
  }
}

function blockFilter(
  viewerId: string | undefined,
  creator: Prisma.Sql,
): Prisma.Sql {
  return viewerId === undefined
    ? Prisma.empty
    : Prisma.sql`AND NOT EXISTS (
        SELECT 1 FROM "block" b
        WHERE b.blocker_id = ${viewerId} AND b.blocked_id = ${creator}
      )`
}

export function searchCatalog(
  type: 'series' | 'episode' | 'user',
  query: string,
  options: SearchRepositoryOptions,
): Promise<Page<SearchCatalogRow>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : scoreCursor(options.cursor)
    const like = `%${escapeLike(query)}%`

    if (type === 'series') {
      const rows = await db.$queryRaw<SeriesRawRow[]>(Prisma.sql`
        SELECT s.id, s.title, s.slug, s.poster_key AS "posterKey",
          s.owner_id AS "creatorId", creator.handle AS "creatorHandle",
          creator.display_name AS "creatorDisplayName",
          creator.avatar_key AS "creatorAvatarKey",
          similarity(s.title, ${query}) AS "searchScore"
        FROM series s
        INNER JOIN "user" creator ON creator.id = s.owner_id
        WHERE s.deleted_at IS NULL AND creator.deleted_at IS NULL
          AND creator.status = 'ACTIVE'::"UserStatus"
          AND (s.title ILIKE ${like} ESCAPE '\\' OR similarity(s.title, ${query}) > 0.2)
          ${blockFilter(options.viewerId, Prisma.sql`s.owner_id`)}
          ${cursor === null ? Prisma.empty : Prisma.sql`AND (similarity(s.title, ${query}), s.id) < (${cursor.score}, ${cursor.id})`}
        ORDER BY "searchScore" DESC, s.id DESC
        LIMIT ${options.limit + 1}
      `)
      const page = searchPage(rows, options.limit)
      return {
        ...page,
        items: page.items.map((row) => ({ ...row, type: 'series' as const })),
      }
    }

    if (type === 'user') {
      const rows = await db.$queryRaw<UserRawRow[]>(Prisma.sql`
        SELECT u.id, u.handle, u.display_name AS "displayName",
          u.avatar_key AS "avatarKey", u.follower_count AS "followerCount",
          GREATEST(similarity(u.handle, ${query}), similarity(u.display_name, ${query})) AS "searchScore"
        FROM "user" u
        WHERE u.deleted_at IS NULL AND u.status = 'ACTIVE'::"UserStatus"
          AND (u.handle ILIKE ${like} ESCAPE '\\' OR u.display_name ILIKE ${like} ESCAPE '\\'
            OR similarity(u.handle, ${query}) > 0.2 OR similarity(u.display_name, ${query}) > 0.2)
          ${blockFilter(options.viewerId, Prisma.sql`u.id`)}
          ${cursor === null ? Prisma.empty : Prisma.sql`AND (GREATEST(similarity(u.handle, ${query}), similarity(u.display_name, ${query})), u.id) < (${cursor.score}, ${cursor.id})`}
        ORDER BY "searchScore" DESC, u.id DESC
        LIMIT ${options.limit + 1}
      `)
      const page = searchPage(rows, options.limit)
      return {
        ...page,
        items: page.items.map((row) => ({ ...row, type: 'user' as const })),
      }
    }

    const rows = await db.$queryRaw<EpisodeRawRow[]>(Prisma.sql`
      SELECT ${episodeSelect(query)}
      FROM episode e
      INNER JOIN series s ON s.id = e.series_id
      INNER JOIN "user" creator ON creator.id = s.owner_id
      LEFT JOIN video_asset asset ON asset.id = e.asset_id
      WHERE e.status = 'PUBLISHED'::"EpisodeStatus" AND e.deleted_at IS NULL
        AND e.published_at IS NOT NULL AND s.deleted_at IS NULL
        AND creator.deleted_at IS NULL AND creator.status = 'ACTIVE'::"UserStatus"
        AND (e.title ILIKE ${like} ESCAPE '\\' OR similarity(e.title, ${query}) > 0.2)
        ${blockFilter(options.viewerId, Prisma.sql`s.owner_id`)}
        ${cursor === null ? Prisma.empty : Prisma.sql`AND (similarity(e.title, ${query}), e.id) < (${cursor.score}, ${cursor.id})`}
      ORDER BY "searchScore" DESC, e.id DESC
      LIMIT ${options.limit + 1}
    `)
    const page = searchPage(rows, options.limit)
    return {
      ...page,
      items: page.items.map((row) => ({
        type: 'episode' as const,
        episode: mapEpisode(row),
      })),
    }
  })
}

function episodeSelect(query: string): Prisma.Sql {
  return Prisma.sql`e.id, e.series_id AS "seriesId", e.season_id AS "seasonId",
    e.asset_id AS "assetId", e.number, e.title, e.description,
    e.thumb_key AS "thumbKey", e.status, e.age_rating AS "ageRating",
    e.visibility, e.language, e.category_id AS "categoryId", e.keywords,
    e.allow_embed AS "allowEmbed", e.allow_download AS "allowDownload",
    e.recorded_at AS "recordedAt", e.meta_title AS "metaTitle",
    e.meta_description AS "metaDescription", e.og_image_key AS "ogImageKey",
    e.canonical_path AS "canonicalPath", e.made_for_kids AS "madeForKids",
    e.license, e.content_warnings AS "contentWarnings",
    e.regions_allowed AS "regionsAllowed", e.regions_blocked AS "regionsBlocked",
    e.ai_disclosure AS "aiDisclosure", e.ai_models AS "aiModels",
    e.ai_tools AS "aiTools", e.ai_human_role AS "aiHumanRole",
    e.ai_generated_pct AS "aiGeneratedPct",
    e.publish_at AS "publishAt",
    e.published_at AS "publishedAt", e.view_count AS "viewCount",
    e.like_count AS "likeCount", e.comment_count AS "commentCount",
    e.share_count AS "shareCount", e.impression_count AS "impressionCount",
    e.avg_watch_sec AS "avgWatchSec",
    e.rank_score AS "rankScore", e.created_at AS "createdAt",
    e.updated_at AS "updatedAt", e.deleted_at AS "deletedAt",
    s.owner_id AS "creatorId", s.title AS "seriesTitle", s.slug AS "seriesSlug",
    creator.handle AS "creatorHandle", creator.display_name AS "creatorDisplayName",
    creator.avatar_key AS "creatorAvatarKey",
    creator.tier AS "creatorTier",
    creator.verified_at AS "creatorVerifiedAt",
    COALESCE(e.duration_sec, asset.duration_sec) AS "durationSec",
    similarity(e.title, ${query}) AS "searchScore"`
}

function mapEpisode(row: EpisodeRawRow): FeedRow {
  return {
    ...row,
    viewCount: row.viewCount.toString(),
    impressionCount: row.impressionCount.toString(),
    publishedAt: row.publishedAt,
  }
}

export function listTagFeed(
  tag: string,
  options: SearchRepositoryOptions,
): Promise<Page<FeedRow>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : dateCursor(options.cursor)
    const rows = await db.$queryRaw<EpisodeRawRow[]>(Prisma.sql`
      SELECT ${episodeSelect('')}
      FROM episode e
      INNER JOIN series s ON s.id = e.series_id
      INNER JOIN "user" creator ON creator.id = s.owner_id
      LEFT JOIN video_asset asset ON asset.id = e.asset_id
      WHERE e.status = 'PUBLISHED'::"EpisodeStatus" AND e.deleted_at IS NULL
        AND e.published_at IS NOT NULL AND s.deleted_at IS NULL
        AND creator.deleted_at IS NULL AND creator.status = 'ACTIVE'::"UserStatus"
        AND EXISTS (
          SELECT 1 FROM tag t
          WHERE lower(t.name) = lower(${tag}) AND (
            EXISTS (SELECT 1 FROM episode_tag et WHERE et.tag_id = t.id AND et.episode_id = e.id)
            OR EXISTS (SELECT 1 FROM series_tag st WHERE st.tag_id = t.id AND st.series_id = s.id)
          )
        )
        ${blockFilter(options.viewerId, Prisma.sql`s.owner_id`)}
        ${cursor === null ? Prisma.empty : Prisma.sql`AND (e.published_at, e.id) < (${cursor.publishedAt}, ${cursor.id})`}
      ORDER BY e.published_at DESC, e.id DESC
      LIMIT ${options.limit + 1}
    `)
    const hasNext = rows.length > options.limit
    const pageRows = hasNext ? rows.slice(0, options.limit) : rows
    const last = pageRows.at(-1)
    return {
      items: pageRows.map(mapEpisode),
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({ k: last.publishedAt.toISOString(), id: last.id })
          : null,
    }
  })
}

export function listTrendingTags(limit = 20): Promise<readonly TrendingTag[]> {
  return executeDb(async () =>
    db.tag.findMany({
      orderBy: [{ useCount: 'desc' }, { name: 'asc' }],
      take: limit,
      select: { name: true, useCount: true },
    }),
  )
}
