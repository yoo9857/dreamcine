'use client'

import { NotImplementedError, type FeedItem } from '@aidream/core'
import type { ReactNode } from 'react'

export interface FeedListProps {
  readonly type: 'popular' | 'latest' | 'following'
  readonly initialItems: readonly FeedItem[]
  readonly initialCursor: string | null
}

export function FeedList(props: FeedListProps): ReactNode {
  void props
  throw new NotImplementedError('T09:FeedList')
}
