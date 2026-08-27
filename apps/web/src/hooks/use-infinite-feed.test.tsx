// @vitest-environment jsdom

import type { FeedItem } from '@aidream/core'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import React, { type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useInfiniteFeed } from './use-infinite-feed'

const first: FeedItem = {
  episodeId: 'episode-1',
  title: 'First',
  thumbUrl: null,
  durationSec: 60,
  ageRating: 'ALL',
  viewCount: '1',
  likeCount: 0,
  publishedAt: '2026-08-25T00:00:00.000Z',
  series: { id: 'series-1', title: 'Series', slug: 'series' },
  creator: {
    handle: 'creator',
    displayName: 'Creator',
    avatarUrl: null,
    tier: 'BRONZE',
    isVerified: false,
  },
  isLiked: false,
}
const second: FeedItem = { ...first, episodeId: 'episode-2', title: 'Second' }

let observerCallback: IntersectionObserverCallback
let observerOptions: IntersectionObserverInit | undefined

class FakeIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin: string
  readonly thresholds = [0]

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    observerCallback = callback
    observerOptions = options
    this.rootMargin = options?.rootMargin ?? '0px'
  }

  disconnect = vi.fn()
  observe = vi.fn()
  takeRecords = vi.fn(() => [])
  unobserve = vi.fn()
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function mountFeed() {
  let latest: ReturnType<typeof useInfiniteFeed> | undefined
  function Probe(): ReactNode {
    latest = useInfiniteFeed({
      endpoint: '/api/feed?type=popular',
      initialItems: [first],
      initialCursor: 'cursor-1',
    })
    return <div ref={latest.sentinelRef} />
  }
  render(<Probe />)
  return () => {
    if (latest === undefined) throw new Error('feed hook was not rendered')
    return latest
  }
}

function intersect(): void {
  observerCallback(
    [{ isIntersecting: true } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  )
}

describe('useInfiniteFeed', () => {
  it('restores a remembered position after returning to the feed', async () => {
    window.sessionStorage.setItem('aidream:feed-scroll:/', '480')
    const scrollTo = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined)
    vi.stubGlobal(
      'requestAnimationFrame',
      (callback: FrameRequestCallback): number => {
        callback(0)
        return 1
      },
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    mountFeed()

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({ top: 480, behavior: 'auto' })
    })
    expect(window.sessionStorage.getItem('aidream:feed-scroll:/')).toBeNull()
  })

  it('restores on browser back when the cached feed remains mounted', async () => {
    const scrollTo = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined)
    vi.stubGlobal(
      'requestAnimationFrame',
      (callback: FrameRequestCallback): number => {
        callback(0)
        return 1
      },
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    mountFeed()

    window.sessionStorage.setItem('aidream:feed-scroll:/', '720')
    window.dispatchEvent(new PopStateEvent('popstate'))

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({ top: 720, behavior: 'auto' })
    })
  })

  it('prefetches at 400px and removes duplicate episodes across pages', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ items: [first, second], nextCursor: null }),
            { status: 200 },
          ),
        ),
    )
    const current = mountFeed()
    expect(observerOptions?.rootMargin).toBe('400px 0px')
    expect(current().hasNextPage).toBe(true)
    act(() => {
      intersect()
    })
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce()
    })
    await waitFor(() => {
      expect(current().items).toHaveLength(2)
    })
    expect(current().items.map((item) => item.episodeId)).toEqual([
      'episode-1',
      'episode-2',
    ])
  })

  it('keeps loaded items after a failed next page and can retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [second], nextCursor: null }), {
          status: 200,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const current = mountFeed()
    expect(current().hasNextPage).toBe(true)
    act(() => {
      intersect()
    })
    await waitFor(() => {
      expect(current().isFetchNextPageError).toBe(true)
    })
    expect(current().items).toEqual([first])
    await act(async () => {
      await current().fetchNextPage()
    })
    await waitFor(() => {
      expect(current().items).toHaveLength(2)
    })
  })
})
