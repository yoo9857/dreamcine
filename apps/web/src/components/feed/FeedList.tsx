'use client'

import type { FeedItem } from '@aidream/core'
import { Button, EmptyState, ErrorState } from '@aidream/ui'
import React, { type ReactNode } from 'react'

import { useInfiniteFeed } from '@/src/hooks/use-infinite-feed'
import { EpisodeCard } from './EpisodeCard'
import { FeedSkeleton } from './FeedSkeleton'

export interface FeedListProps {
  readonly type: 'popular' | 'latest' | 'following'
  readonly initialItems: readonly FeedItem[]
  readonly initialCursor: string | null
  readonly endpoint?: string
  readonly priorityFirst?: boolean
}

export function FeedList(props: FeedListProps): ReactNode {
  const feed = useInfiniteFeed({
    endpoint: props.endpoint ?? `/api/feed?type=${props.type}&limit=20`,
    initialItems: props.initialItems,
    initialCursor: props.initialCursor,
  })

  if (feed.isError && feed.items.length === 0) {
    return (
      <ErrorState
        description="피드를 불러오지 못했습니다."
        onRetry={() => {
          void feed.refetch()
        }}
      />
    )
  }
  if (feed.items.length === 0) {
    return (
      <EmptyState
        title="아직 공개된 에피소드가 없습니다"
        description="새로운 이야기가 공개되면 이곳에 표시됩니다."
      />
    )
  }

  return (
    <section
      aria-label="에피소드 피드"
      className="episode-feed flex flex-col gap-6"
    >
      <div className="episode-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {feed.items.map((item, index) => (
          <EpisodeCard
            key={item.episodeId}
            item={item}
            priority={(props.priorityFirst ?? true) && index === 0}
          />
        ))}
      </div>
      {feed.isFetchNextPageError ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => void feed.fetchNextPage()}>
            다음 목록 다시 불러오기
          </Button>
        </div>
      ) : null}
      {feed.isFetchingNextPage ? <FeedSkeleton count={3} /> : null}
      <div ref={feed.sentinelRef} aria-hidden="true" className="h-px" />
    </section>
  )
}
