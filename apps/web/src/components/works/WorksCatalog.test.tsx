// @vitest-environment jsdom

import type { FeedItem } from '@aidream/core'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import React, { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  afterEach(cleanup)
  beforeEach(() => {
    window.history.replaceState(null, '', '/works')
    vi.mocked(useInfiniteFeed).mockReturnValue(hookResult())
  })

  it('opens a short collection immediately and preserves sorting when paging', () => {
    const view = render(
      <WorksCatalog
        initialItems={items}
        initialCursor={null}
        feedType="popular"
        initialFormat="short"
      />,
    )
    expect(screen.queryByRole('heading', { name: 'LONG FORM' })).toBeNull()
    expect(view.container.querySelector('.works-short-card')).not.toBeNull()
    expect(vi.mocked(useInfiniteFeed).mock.lastCall?.[0].endpoint).toBe(
      '/api/feed?type=popular&limit=24',
    )
    expect(
      screen.getByRole('link', { name: '최신순' }).getAttribute('href'),
    ).toBe('/works?sort=latest&format=short')
  })
  it('restores the format after browser navigation', () => {
    render(<WorksCatalog initialItems={items} initialCursor={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'SHORT FORM' }))
    expect(new URL(window.location.href).searchParams.get('format')).toBe(
      'short',
    )
    window.history.replaceState(null, '', '/works?format=long')
    fireEvent.popState(window)
    expect(screen.queryByRole('heading', { name: 'SHORT FORM' })).toBeNull()
    expect(
      screen
        .getByRole('button', { name: 'LONG FORM' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })
  it('does not claim there are no shorts while more pages remain', () => {
    vi.mocked(useInfiniteFeed).mockReturnValue(
      hookResult({ items: [base], hasNextPage: true }),
    )
    render(
      <WorksCatalog
        initialItems={[base]}
        initialCursor="next"
        initialFormat="short"
      />,
    )
    expect(screen.queryByText('공개된 숏폼 작품이 아직 없습니다.')).toBeNull()
    expect(screen.getByRole('button', { name: /MORE WORKS/u })).toBeTruthy()
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
    // 페스티벌 2편도 같은 롱폼 칸에 들어가 개수에 포함된다.
    expect(view.getByText('4 LOADED')).toBeTruthy()
    expect(view.getByText('1 LOADED')).toBeTruthy()
    expect(view.getByRole('heading', { name: '세로 작품' })).toBeTruthy()
    expect(view.queryByRole('heading', { name: '짧은 롱폼' })).toBeNull()

    const grid = container.querySelector('.works-long-grid')
    expect(grid).toBeTruthy()
    const titles = [
      ...(grid as HTMLElement).querySelectorAll('.works-card-title'),
    ].map((node) => node.textContent)
    expect(titles.slice(0, 4)).toEqual([
      'THREAD',
      'Borrowed Wounds',
      '긴 작품',
      '짧은 롱폼',
    ])
    expect(container.querySelector('.works-partner-list')).toBeNull()
    expect(view.queryByText('HIGGSFIELD × ILOG')).toBeNull()
    expect(
      view.getByRole('link', { name: 'THREAD' }).getAttribute('href'),
    ).toBe('/watch/higgsfield/thread')
    expect(
      view.getAllByRole('link', { name: 'Higgsfield 프로필' }).length,
    ).toBe(2)
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
