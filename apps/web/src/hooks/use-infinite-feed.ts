'use client'

import { FeedPageSchema, type FeedItem } from '@aidream/core'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  forgetFeedScrollPosition,
  readFeedScrollPosition,
} from '@/src/lib/feed-scroll'

export interface InfiniteFeedOptions {
  readonly endpoint: string
  readonly initialItems: readonly FeedItem[]
  readonly initialCursor: string | null
}

export function useInfiniteFeed(options: InfiniteFeedOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const restoredScrollRef = useRef(false)
  const fetchingRef = useRef(false)
  const [items, setItems] = useState<readonly FeedItem[]>(options.initialItems)
  const [nextCursor, setNextCursor] = useState<string | null>(
    options.initialCursor,
  )
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false)
  const [isFetchNextPageError, setIsFetchNextPageError] = useState(false)

  const requestPage = useCallback(
    async (cursor: string | null) => {
      const url = new URL(options.endpoint, window.location.origin)
      if (cursor !== null) url.searchParams.set('cursor', cursor)
      const response = await fetch(url, { credentials: 'same-origin' })
      if (!response.ok)
        throw new Error(`feed request failed: ${String(response.status)}`)
      return FeedPageSchema.parse(await response.json())
    },
    [options.endpoint],
  )

  const fetchNextPage = useCallback(async (): Promise<void> => {
    if (nextCursor === null || fetchingRef.current) return
    fetchingRef.current = true
    setIsFetchingNextPage(true)
    setIsFetchNextPageError(false)
    try {
      const page = await requestPage(nextCursor)
      setItems((current) => {
        const seen = new Set(current.map((item) => item.episodeId))
        return [
          ...current,
          ...page.items.filter((item) =>
            seen.has(item.episodeId) ? false : (seen.add(item.episodeId), true),
          ),
        ]
      })
      setNextCursor(page.nextCursor)
    } catch {
      setIsFetchNextPageError(true)
    } finally {
      fetchingRef.current = false
      setIsFetchingNextPage(false)
    }
  }, [nextCursor, requestPage])

  const refetch = useCallback(async (): Promise<void> => {
    setIsFetchNextPageError(false)
    try {
      const page = await requestPage(null)
      setItems(page.items)
      setNextCursor(page.nextCursor)
    } catch {
      setIsFetchNextPageError(true)
    }
  }, [requestPage])

  const hasNextPage = nextCursor !== null

  useEffect(() => {
    const target = sentinelRef.current
    if (target === null || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage()
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(target)
    return () => {
      observer.disconnect()
    }
  }, [fetchNextPage, hasNextPage])

  useEffect(() => {
    let firstFrame: number | undefined
    let secondFrame: number | undefined
    const restore = (): void => {
      if (restoredScrollRef.current) return
      const position = readFeedScrollPosition()
      if (position === null) return

      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          window.scrollTo({ top: position, behavior: 'auto' })
          forgetFeedScrollPosition()
          restoredScrollRef.current = true
        })
      })
    }

    restore()
    window.addEventListener('popstate', restore)
    return () => {
      window.removeEventListener('popstate', restore)
      if (firstFrame !== undefined) window.cancelAnimationFrame(firstFrame)
      if (secondFrame !== undefined) window.cancelAnimationFrame(secondFrame)
    }
  }, [items.length])

  return {
    items,
    sentinelRef,
    hasNextPage,
    isError: isFetchNextPageError && items.length === 0,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    refetch,
  }
}
