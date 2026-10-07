import type {
  FeedItem,
  Page,
  SearchQuery,
  SearchResult,
  TagFeedQuery,
  TrendingTag,
} from '@aidream/core'
import { AppError } from '@aidream/core'
import {
  decodeCursor,
  encodeCursor,
  listBlockedCreatorIds,
  listLikedEpisodeIds,
  listTagFeed,
  listTrendingTags,
  searchCatalog,
  type SearchCatalogRow,
} from '@aidream/db'
import { avatarUrl, cdnUrl } from '@aidream/storage/cdn'

import type { RouteSession } from '@/src/auth/types'
import { higgsfieldSearchResults } from '@/src/content/higgsfield'
import { getLogger } from '@/src/lib/logger'
import { getRedis } from '@/src/lib/redis'
import {
  toCachedFeedRow,
  toPublicFeedItem,
  type CachedFeedRow,
} from './get-feed'

export interface SearchServiceDependencies {
  readonly searchCatalog: typeof searchCatalog
  readonly tagFeed: typeof listTagFeed
  readonly trendingTags: typeof listTrendingTags
  readonly likedIds: typeof listLikedEpisodeIds
  readonly blockedCreatorIds: typeof listBlockedCreatorIds
  readonly readCache: (key: string) => Promise<string | null>
  readonly writeCache: (
    key: string,
    value: string,
    ttlSec: number,
  ) => Promise<void>
}

function productionDependencies(): SearchServiceDependencies {
  return {
    searchCatalog,
    tagFeed: listTagFeed,
    trendingTags: listTrendingTags,
    likedIds: listLikedEpisodeIds,
    blockedCreatorIds: listBlockedCreatorIds,
    readCache: (key) => getRedis().get(key),
    writeCache: (key, value, ttlSec) => getRedis().set(key, value, ttlSec),
  }
}

function mapSearchRow(
  row: SearchCatalogRow,
  liked: ReadonlySet<string>,
): SearchResult {
  if (row.type === 'series') {
    return {
      type: 'series',
      id: row.id,
      title: row.title,
      slug: row.slug,
      posterUrl: row.posterKey === null ? null : cdnUrl(row.posterKey),
      creator: {
        handle: row.creatorHandle,
        displayName: row.creatorDisplayName,
        avatarUrl: avatarUrl(row.creatorAvatarKey),
        tier: row.creatorTier,
        isVerified: row.creatorVerifiedAt !== null,
      },
    }
  }
  if (row.type === 'user') {
    return {
      type: 'user',
      handle: row.handle,
      displayName: row.displayName,
      avatarUrl: avatarUrl(row.avatarKey),
      followerCount: row.followerCount,
    }
  }
  const cached = toCachedFeedRow(row.episode)
  return {
    type: 'episode',
    episode: toPublicFeedItem(cached, liked.has(cached.episodeId)),
  }
}

export async function search(
  query: SearchQuery,
  session: RouteSession | null,
  dependencies: SearchServiceDependencies = productionDependencies(),
): Promise<Page<SearchResult>> {
  const prefix = 'partner-search:'
  const matches = higgsfieldSearchResults(query.type, query.q)
  let offset = 0
  let catalogCursor = query.cursor
  if (catalogCursor?.startsWith(prefix)) {
    const cursor = decodeCursor(catalogCursor.slice(prefix.length))
    if (
      cursor.id !== `${query.type}:${query.q}` ||
      typeof cursor.k !== 'number' ||
      !Number.isInteger(cursor.k) ||
      cursor.k < 0 ||
      cursor.k > matches.length
    )
      throw new AppError('E_FEED_INVALID_CURSOR')
    offset = cursor.k
    catalogCursor = undefined
  }
  const partner =
    catalogCursor === undefined
      ? matches.slice(offset, offset + query.limit)
      : []
  const remaining = query.limit - partner.length
  const partnerCursor = () =>
    `${prefix}${encodeCursor({
      id: `${query.type}:${query.q}`,
      k: offset + partner.length,
    })}`
  if (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL) {
    return {
      items: [...partner],
      nextCursor:
        offset + partner.length < matches.length && remaining === 0
          ? partnerCursor()
          : null,
    }
  }
  const page = await dependencies.searchCatalog(query.type, query.q, {
    limit: Math.max(1, remaining),
    ...(catalogCursor === undefined ? {} : { cursor: catalogCursor }),
    ...(session === null ? {} : { viewerId: session.userId }),
  })
  if (remaining === 0)
    return {
      items: [...partner],
      nextCursor:
        offset + partner.length < matches.length || page.items.length > 0
          ? partnerCursor()
          : null,
    }
  const episodeIds = page.items.flatMap((row) =>
    row.type === 'episode' ? [row.episode.id] : [],
  )
  const liked =
    session === null
      ? new Set<string>()
      : await dependencies.likedIds(session.userId, episodeIds)
  const catalog = page.items.map((row) => mapSearchRow(row, liked))
  return {
    items: [...partner, ...catalog],
    nextCursor: page.nextCursor,
  }
}

function parseTagCache(value: string): Page<CachedFeedRow> | null {
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null) return null
    const page = parsed as Partial<Page<CachedFeedRow>>
    if (!Array.isArray(page.items)) return null
    if (page.nextCursor !== null && typeof page.nextCursor !== 'string')
      return null
    return page as Page<CachedFeedRow>
  } catch {
    return null
  }
}

export async function getTagFeed(
  tag: string,
  query: TagFeedQuery,
  session: RouteSession | null,
  dependencies: SearchServiceDependencies = productionDependencies(),
): Promise<Page<FeedItem>> {
  const cacheable = query.cursor === undefined
  const key = `feed:tag:${tag.toLocaleLowerCase()}:${String(query.limit)}`
  let cached: Page<CachedFeedRow> | null = null
  if (cacheable) {
    try {
      const value = await dependencies.readCache(key)
      cached = value === null ? null : parseTagCache(value)
    } catch (error: unknown) {
      getLogger().warn({ err: error, cacheKey: key }, 'tag cache read bypassed')
    }
  }
  if (cached === null) {
    const page = await dependencies.tagFeed(tag, {
      limit: query.limit,
      ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
      ...(cacheable || session === null ? {} : { viewerId: session.userId }),
    })
    cached = {
      items: page.items.map(toCachedFeedRow),
      nextCursor: page.nextCursor,
    }
    if (cacheable) {
      try {
        await dependencies.writeCache(key, JSON.stringify(cached), 60)
      } catch (error: unknown) {
        getLogger().warn(
          { err: error, cacheKey: key },
          'tag cache write bypassed',
        )
      }
    }
  }

  let rows = cached.items
  if (session !== null && cacheable) {
    const blocked = await dependencies.blockedCreatorIds(
      session.userId,
      rows.map((row) => row.creatorId),
    )
    rows = rows.filter((row) => !blocked.has(row.creatorId))
  }
  const liked =
    session === null
      ? new Set<string>()
      : await dependencies.likedIds(
          session.userId,
          rows.map((row) => row.episodeId),
        )
  return {
    items: rows.map((row) => toPublicFeedItem(row, liked.has(row.episodeId))),
    nextCursor: cached.nextCursor,
  }
}

export async function getTrendingTags(
  dependencies: SearchServiceDependencies = productionDependencies(),
): Promise<{ readonly items: readonly TrendingTag[] }> {
  const key = 'tags:trending:20'
  try {
    const cached = await dependencies.readCache(key)
    if (cached !== null) {
      const items: unknown = JSON.parse(cached)
      if (Array.isArray(items)) return { items: items as TrendingTag[] }
    }
  } catch (error: unknown) {
    getLogger().warn(
      { err: error, cacheKey: key },
      'trending tag cache read bypassed',
    )
  }
  const items = await dependencies.trendingTags(20)
  try {
    await dependencies.writeCache(key, JSON.stringify(items), 300)
  } catch (error: unknown) {
    getLogger().warn(
      { err: error, cacheKey: key },
      'trending tag cache write bypassed',
    )
  }
  return { items }
}
