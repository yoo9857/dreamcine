import {
  NotImplementedError,
  type FeedItem,
  type Page,
  type SearchQuery,
  type SearchResult,
  type TagFeedQuery,
  type TrendingTag,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function search(
  query: SearchQuery,
  session: RouteSession | null,
): Promise<Page<SearchResult>> {
  void query
  void session
  throw new NotImplementedError('T09:search')
}

export function getTagFeed(
  tag: string,
  query: TagFeedQuery,
  session: RouteSession | null,
): Promise<Page<FeedItem>> {
  void tag
  void query
  void session
  throw new NotImplementedError('T09:tagFeed')
}

export function getTrendingTags(): Promise<{
  readonly items: readonly TrendingTag[]
}> {
  throw new NotImplementedError('T09:trendingTags')
}
