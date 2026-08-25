'use client'

import { FeedPageSchema, type FeedItem } from '@aidream/core'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

export interface InfiniteFeedOptions {
  readonly endpoint: string
  readonly queryKey: readonly unknown[]
  readonly initialItems: readonly FeedItem[]
  readonly initialCursor: string | null
}

export function useInfiniteFeed(options: InfiniteFeedOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const query = useInfiniteQuery({
    queryKey: options.queryKey,
    staleTime: 30_000,
    initialPageParam: null as string | null,
    initialData: {
      pages: [
        { items: [...options.initialItems], nextCursor: options.initialCursor },
      ],
      pageParams: [null],
    },
    queryFn: async ({ pageParam }) => {
      const url = new URL(options.endpoint, window.location.origin)
      if (pageParam !== null) url.searchParams.set('cursor', pageParam)
      const response = await fetch(url, { credentials: 'same-origin' })
      if (!response.ok)
        throw new Error(`feed request failed: ${String(response.status)}`)
      return FeedPageSchema.parse(await response.json())
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  useEffect(() => {
    const target = sentinelRef.current
    if (target === null || !query.hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          !query.isFetchingNextPage
        ) {
          void query.fetchNextPage()
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(target)
    return () => {
      observer.disconnect()
    }
  }, [query.fetchNextPage, query.hasNextPage, query.isFetchingNextPage])

  const seen = new Set<string>()
  const items = query.data.pages
    .flatMap((page) => page.items)
    .filter((item) =>
      seen.has(item.episodeId) ? false : (seen.add(item.episodeId), true),
    )

  return { ...query, items, sentinelRef }
}
