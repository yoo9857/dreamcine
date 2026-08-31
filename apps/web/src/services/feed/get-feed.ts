import {
  AppError,
  type FeedItem,
  type FeedQuery,
  type MemberTier,
  type Page,
} from '@aidream/core'
import {
  listBlockedCreatorIds,
  listFollowingFeed,
  listLatestFeed,
  listLikedEpisodeIds,
  listPopularFeed,
  type FeedRow,
} from '@aidream/db'
import { avatarUrl, cdnUrl, thumbUrl } from '@aidream/storage/cdn'

import type { RouteSession } from '@/src/auth/types'
import { getLogger } from '@/src/lib/logger'
import { getRedis } from '@/src/lib/redis'

export interface CachedFeedRow {
  readonly episodeId: string
  readonly creatorId: string
  readonly title: string
  readonly thumbKey: string | null
  readonly assetId: string | null
  readonly durationSec: number | null
  readonly ageRating: FeedItem['ageRating']
  readonly viewCount: string
  readonly likeCount: number
  readonly publishedAt: string
  readonly series: FeedItem['series']
  readonly creatorHandle: string
  readonly creatorDisplayName: string
  readonly creatorAvatarKey: string | null
  /**
   * 등급·인증은 **선택 필드**다. 이 캐시는 Redis 에 이미 들어 있는 항목이
   * 있고, 배포 직후에는 등급 없이 직렬화된 옛 항목이 TTL 만큼 남는다.
   * 필수로 두면 그 시간 동안 피드가 깨진다.
   */
  readonly creatorTier?: MemberTier
  readonly creatorVerifiedAt?: string | null
}

type CachedFeedPage = Page<CachedFeedRow>

export interface FeedServiceDependencies {
  readonly readCache: (key: string) => Promise<string | null>
  readonly writeCache: (
    key: string,
    value: string,
    ttlSec: number,
  ) => Promise<void>
  readonly popular: typeof listPopularFeed
  readonly latest: typeof listLatestFeed
  readonly following: typeof listFollowingFeed
  readonly likedIds: typeof listLikedEpisodeIds
  readonly blockedCreatorIds: typeof listBlockedCreatorIds
}

function productionDependencies(): FeedServiceDependencies {
  return {
    readCache: (key) => getRedis().get(key),
    writeCache: (key, value, ttlSec) => getRedis().set(key, value, ttlSec),
    popular: listPopularFeed,
    latest: listLatestFeed,
    following: listFollowingFeed,
    likedIds: listLikedEpisodeIds,
    blockedCreatorIds: listBlockedCreatorIds,
  }
}

export function toCachedFeedRow(row: FeedRow): CachedFeedRow {
  if (row.publishedAt === null)
    throw new AppError('E_INTERNAL', { reason: 'feed-date' })
  return {
    episodeId: row.id,
    creatorId: row.creatorId,
    title: row.title,
    thumbKey: row.thumbKey,
    assetId: row.assetId,
    durationSec: row.durationSec,
    ageRating: row.ageRating,
    viewCount: row.viewCount,
    likeCount: row.likeCount,
    publishedAt: row.publishedAt.toISOString(),
    series: {
      id: row.seriesId,
      title: row.seriesTitle,
      slug: row.seriesSlug,
      ...(row.seriesWorkType === undefined
        ? {}
        : { workType: row.seriesWorkType }),
    },
    creatorHandle: row.creatorHandle,
    creatorDisplayName: row.creatorDisplayName,
    creatorAvatarKey: row.creatorAvatarKey,
    creatorTier: row.creatorTier,
    creatorVerifiedAt: row.creatorVerifiedAt?.toISOString() ?? null,
  }
}

export function toPublicFeedItem(
  row: CachedFeedRow,
  isLiked: boolean,
): FeedItem {
  return {
    episodeId: row.episodeId,
    title: row.title,
    thumbUrl:
      row.thumbKey !== null
        ? cdnUrl(row.thumbKey)
        : row.assetId === null
          ? null
          : thumbUrl(row.assetId),
    durationSec: row.durationSec,
    ageRating: row.ageRating,
    viewCount: row.viewCount,
    likeCount: row.likeCount,
    publishedAt: row.publishedAt,
    series: row.series,
    creator: {
      handle: row.creatorHandle,
      displayName: row.creatorDisplayName,
      avatarUrl: avatarUrl(row.creatorAvatarKey),
      // 옛 캐시 항목에는 등급이 없다. BRONZE 는 배지가 없는 등급이므로
      // 폴백으로 안전하다 — 없는 배지를 그리지 않는다.
      tier: row.creatorTier ?? 'BRONZE',
      isVerified: (row.creatorVerifiedAt ?? null) !== null,
    },
    isLiked,
  }
}

function parseCachedPage(value: string): CachedFeedPage | null {
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null) return null
    const candidate = parsed as Partial<CachedFeedPage>
    if (!Array.isArray(candidate.items)) return null
    if (
      candidate.nextCursor !== null &&
      typeof candidate.nextCursor !== 'string'
    )
      return null
    return candidate as CachedFeedPage
  } catch {
    return null
  }
}

async function readCached(
  key: string,
  dependencies: FeedServiceDependencies,
): Promise<CachedFeedPage | null> {
  try {
    const value = await dependencies.readCache(key)
    return value === null ? null : parseCachedPage(value)
  } catch (error: unknown) {
    getLogger().warn({ err: error, cacheKey: key }, 'feed cache read bypassed')
    return null
  }
}

async function writeCached(
  key: string,
  page: CachedFeedPage,
  ttlSec: number,
  dependencies: FeedServiceDependencies,
): Promise<void> {
  try {
    await dependencies.writeCache(key, JSON.stringify(page), ttlSec)
  } catch (error: unknown) {
    getLogger().warn({ err: error, cacheKey: key }, 'feed cache write bypassed')
  }
}

async function personalize(
  rows: readonly CachedFeedRow[],
  session: RouteSession | null,
  dependencies: FeedServiceDependencies,
): Promise<FeedItem[]> {
  if (session === null) return rows.map((row) => toPublicFeedItem(row, false))
  const liked = await dependencies.likedIds(
    session.userId,
    rows.map((row) => row.episodeId),
  )
  return rows.map((row) => toPublicFeedItem(row, liked.has(row.episodeId)))
}

export async function getFeed(
  query: FeedQuery,
  session: RouteSession | null,
  dependencies: FeedServiceDependencies = productionDependencies(),
): Promise<Page<FeedItem>> {
  if (query.type === 'following') {
    if (session === null) throw new AppError('E_AUTH_REQUIRED')
    const page = await dependencies.following(session.userId, {
      limit: query.limit,
      ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
    })
    const rows = page.items.map(toCachedFeedRow)
    return {
      items: await personalize(rows, session, dependencies),
      nextCursor: page.nextCursor,
    }
  }

  const cacheable = query.cursor === undefined
  const key = `feed:${query.type}:${String(query.limit)}`
  let page = cacheable ? await readCached(key, dependencies) : null
  if (page === null) {
    const fetched = await dependencies[query.type]({
      limit: query.limit,
      ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
    })
    page = {
      items: fetched.items.map(toCachedFeedRow),
      nextCursor: fetched.nextCursor,
    }
    if (cacheable)
      await writeCached(
        key,
        page,
        query.type === 'popular' ? 60 : 30,
        dependencies,
      )
  }

  if (session === null) {
    return {
      items: await personalize(page.items, null, dependencies),
      nextCursor: page.nextCursor,
    }
  }

  const collected: CachedFeedRow[] = []
  let current = page
  let followedPages = 0
  for (;;) {
    const blocked = await dependencies.blockedCreatorIds(
      session.userId,
      current.items.map((row) => row.creatorId),
    )
    collected.push(
      ...current.items.filter((row) => !blocked.has(row.creatorId)),
    )
    if (
      collected.length >= query.limit ||
      current.nextCursor === null ||
      followedPages >= 3
    )
      break
    const fetched = await dependencies[query.type]({
      limit: Math.max(1, query.limit - collected.length),
      cursor: current.nextCursor,
    })
    current = {
      items: fetched.items.map(toCachedFeedRow),
      nextCursor: fetched.nextCursor,
    }
    followedPages += 1
  }

  const rows = collected.slice(0, query.limit)
  return {
    items: await personalize(rows, session, dependencies),
    nextCursor: current.nextCursor,
  }
}
