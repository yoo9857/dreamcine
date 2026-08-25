import {
  NotImplementedError,
  type FeedItem,
  type FeedQuery,
  type Page,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export interface FeedServiceDependencies {
  readonly readCache: (key: string) => Promise<string | null>
  readonly writeCache: (
    key: string,
    value: string,
    ttlSec: number,
  ) => Promise<void>
}

export function getFeed(
  query: FeedQuery,
  session: RouteSession | null,
  dependencies?: FeedServiceDependencies,
): Promise<Page<FeedItem>> {
  void query
  void session
  void dependencies
  throw new NotImplementedError('T09:getFeed')
}
