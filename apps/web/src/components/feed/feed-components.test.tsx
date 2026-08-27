// @vitest-environment jsdom

import type { FeedItem } from '@aidream/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React, { type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EpisodeCard } from './EpisodeCard'
import { FeedList } from './FeedList'

const item: FeedItem = {
  episodeId: 'episode_1',
  title: '첫 화',
  thumbUrl: null,
  durationSec: 60,
  ageRating: 'ALL',
  viewCount: '10',
  likeCount: 1,
  publishedAt: '2026-08-25T00:00:00.000Z',
  series: { id: 'series_1', title: '시리즈', slug: 'series' },
  creator: {
    handle: 'creator',
    displayName: '제작자',
    avatarUrl: null,
    tier: 'BRONZE',
    isVerified: false,
  },
  isLiked: false,
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.sessionStorage.clear()
})

function providers(children: ReactNode): ReactNode {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  )
}

describe('feed components', () => {
  it('reserves a 16:9 thumbnail box to prevent layout shift', () => {
    const { container } = render(<EpisodeCard item={item} />)
    expect(container.querySelector('.aspect-video')).not.toBeNull()
    expect(screen.getByText('첫 화')).toBeTruthy()
  })

  it('renders the honest empty state', () => {
    render(
      providers(
        <FeedList type="popular" initialItems={[]} initialCursor={null} />,
      ),
    )
    expect(screen.getByText('아직 공개된 에피소드가 없습니다')).toBeTruthy()
  })

  it('renders initial server items without a client refetch', () => {
    render(
      providers(
        <FeedList type="popular" initialItems={[item]} initialCursor={null} />,
      ),
    )
    expect(
      screen.getByRole('link', { name: /첫 화/u }).getAttribute('href'),
    ).toBe('/watch/episode_1')
  })

  it('prioritizes only the first feed thumbnail', () => {
    const first = { ...item, thumbUrl: 'https://cdn.example/first.jpg' }
    const second = {
      ...first,
      episodeId: 'episode_2',
      title: '둘째 화',
      thumbUrl: 'https://cdn.example/second.jpg',
    }
    render(
      providers(
        <FeedList
          type="popular"
          initialItems={[first, second]}
          initialCursor={null}
        />,
      ),
    )

    const images = screen.getAllByRole('img')
    expect(images[0]?.getAttribute('loading')).toBeNull()
    expect(images[1]?.getAttribute('loading')).toBe('lazy')
  })

  it('does not reprioritize cards below the homepage hero', () => {
    const imageItem = {
      ...item,
      thumbUrl: 'https://cdn.example/next.jpg',
    }
    render(
      providers(
        <FeedList
          type="popular"
          initialItems={[imageItem]}
          initialCursor={null}
          priorityFirst={false}
        />,
      ),
    )

    expect(screen.getByRole('img').getAttribute('loading')).toBe('lazy')
  })

  it('shows an honest placeholder when media duration is unavailable', () => {
    render(<EpisodeCard item={{ ...item, durationSec: null }} />)
    expect(screen.getByText('--:--')).toBeTruthy()
  })

  it('remembers the feed position before opening an episode', () => {
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 640,
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    render(providers(<EpisodeCard item={item} />))

    const link = screen.getByRole('link', { name: /첫 화/u })
    link.addEventListener('click', (event) => {
      event.preventDefault()
    })
    fireEvent.click(link)

    expect(setItem).toHaveBeenCalledWith('aidream:feed-scroll:/', '640')
  })
})
