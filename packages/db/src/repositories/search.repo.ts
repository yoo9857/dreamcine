import {
  NotImplementedError,
  type FeedItem,
  type Page,
  type SearchResult,
  type TrendingTag,
} from '@aidream/core'

export interface SearchRepositoryOptions {
  readonly limit: number
  readonly cursor?: string
  readonly viewerId?: string
}

export function searchCatalog(
  type: 'series' | 'episode' | 'user',
  query: string,
  options: SearchRepositoryOptions,
): Promise<Page<SearchResult>> {
  void type
  void query
  void options
  throw new NotImplementedError('T09:searchRepo')
}

export function listTagFeed(
  tag: string,
  options: SearchRepositoryOptions,
): Promise<Page<FeedItem>> {
  void tag
  void options
  throw new NotImplementedError('T09:tagFeedRepo')
}

export function listTrendingTags(limit = 20): Promise<readonly TrendingTag[]> {
  void limit
  throw new NotImplementedError('T09:trendingTagsRepo')
}
