// @vitest-environment jsdom

import type { FeedItem } from '@aidream/core'
import { fireEvent, render, screen, within } from '@testing-library/react'
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
  aspectRatio: 16 / 9,
  creator: {
    handle: 'creator',
    displayName: '작가',
    avatarUrl: null,
    tier: 'BRONZE',
    isVerified: false,
  },
  isLiked: false,
}

const items: FeedItem[] = [
  base,
  // 업로더가 형식을 고르지 않은 세로 영상. 비율만으로 숏폼으로 잡혀야 한다.
  {
    ...base,
    episodeId: 'short-1',
    title: '세로 작품',
    durationSec: 60,
    aspectRatio: 9 / 16,
  },
  // 짧지만 가로 영상인 롱폼. 재생시간만 보고 숏폼으로 보내면 안 된다.
  {
    ...base,
    episodeId: 'long-2',
    title: '짧은 롱폼',
    durationSec: 40,
    aspectRatio: 16 / 9,
  },
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

  it('splits formats by video ratio when no work type was picked', () => {
    // 이 스위트에는 자동 cleanup 이 없다. 앞 테스트가 남긴 DOM 과 섞이지
    // 않도록 이 렌더의 컨테이너 안에서만 찾는다.
    const { container } = render(
      <WorksCatalog initialItems={items} initialCursor={null} />,
    )
    const view = within(container)

    // 세로 영상 1편만 숏폼, 짧은 가로 영상은 롱폼에 남는다.
    expect(view.getByText('2 LOADED')).toBeTruthy()
    expect(view.getByText('1 LOADED')).toBeTruthy()
    expect(view.getByRole('heading', { name: '세로 작품' })).toBeTruthy()
    expect(view.queryByRole('heading', { name: '짧은 롱폼' })).toBeNull()
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
