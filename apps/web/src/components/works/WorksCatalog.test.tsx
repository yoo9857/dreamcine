// @vitest-environment jsdom

import type { FeedItem } from '@aidream/core'
import { fireEvent, render, screen } from '@testing-library/react'
import React, { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useInfiniteFeed } from '@/src/hooks/use-infinite-feed'

import { WorksCatalog } from './WorksCatalog'

vi.mock('@/src/hooks/use-infinite-feed', () => ({
  useInfiniteFeed: vi.fn(),
}))

const base: FeedItem = {
  episodeId: 'long-1',
  title: '긴 작품',
  thumbUrl: null,
  durationSec: 600,
  ageRating: 'ALL',
  viewCount: '100',
  likeCount: 4,
  publishedAt: '2026-08-24T12:00:00.000Z',
  series: { id: 'series-1', title: '시리즈', slug: 'series' },
  creator: {
    handle: 'creator',
    displayName: '작가',
    avatarUrl: null,
  },
  isLiked: false,
}

const items = [
  base,
  { ...base, episodeId: 'short-1', title: '짧은 작품', durationSec: 60 },
]

function hookResult(overrides: Record<string, unknown> = {}) {
  return {
    items,
    sentinelRef: createRef<HTMLDivElement>(),
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: vi.fn().mockResolvedValue(undefined),
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('WorksCatalog', () => {
  beforeEach(() => {
    vi.mocked(useInfiniteFeed).mockReturnValue(hookResult())
  })

  it('filters long and short works with pressed-state buttons', () => {
    render(<WorksCatalog initialItems={items} initialCursor={null} />)

    fireEvent.click(screen.getByRole('button', { name: 'SHORT FORM' }))

    expect(screen.queryByRole('heading', { name: 'LONG FORM' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'SHORT FORM' })).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: 'SHORT FORM' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('renders card skeletons while the next cursor page is loading', () => {
    vi.mocked(useInfiniteFeed).mockReturnValue(
      hookResult({ hasNextPage: true, isFetchingNextPage: true }),
    )

    render(<WorksCatalog initialItems={items} initialCursor="next" />)

    expect(screen.getByRole('status').getAttribute('aria-label')).toBe(
      '다음 작품 불러오는 중',
    )
  })
})
