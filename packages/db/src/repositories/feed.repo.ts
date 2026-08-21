import type { Episode, Page } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

export interface FeedOptions {
  limit: number
  cursor?: string
  viewerId?: string
}

export function listPopularFeed(_options: FeedOptions): Promise<Page<Episode>> {
  throw new NotImplementedError('T02:listPopularFeed')
}

export function listLatestFeed(_options: FeedOptions): Promise<Page<Episode>> {
  throw new NotImplementedError('T02:listLatestFeed')
}

export function listFollowingFeed(
  _viewerId: string,
  _options: Omit<FeedOptions, 'viewerId'>,
): Promise<Page<Episode>> {
  throw new NotImplementedError('T02:listFollowingFeed')
}
