// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import React, { useSyncExternalStore, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SearchResults } from './SearchResults'

vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    new URLSearchParams(
      useSyncExternalStore(
        (notify) => {
          window.addEventListener('popstate', notify)
          return () => {
            window.removeEventListener('popstate', notify)
          }
        },
        () => window.location.search,
      ),
    ),
}))
vi.mock('@/src/components/QueryProvider', () => ({
  QueryProvider: ({ children }: { children: ReactNode }) => (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  ),
}))
vi.mock('@/src/components/discovery/DiscoveryTopbar', () => ({
  DiscoveryTopbar: ({ search }: { search: ReactNode }) => (
    <header>{search}</header>
  ),
}))
vi.mock('@/components/ui/liquid-metal-button', () => ({
  LiquidMetalButton: ({ label, ...props }: { label: string }) => (
    <button {...props}>{label}</button>
  ),
}))

const creator = {
  handle: 'creator',
  displayName: '제작자',
  avatarUrl: null,
  tier: 'BRONZE',
  isVerified: false,
}
const episode = (id: string) => ({
  type: 'episode',
  episode: {
    episodeId: id,
    title: `Fire ${id}`,
    thumbUrl: null,
    durationSec: 90,
    ageRating: 'ALL',
    viewCount: '42',
    likeCount: 3,
    publishedAt: '2026-10-11T00:00:00.000Z',
    series: { id: 'series', title: 'Fire series', slug: 'fire' },
    creator,
    isLiked: false,
  },
})
const response = (items: unknown[], nextCursor: string | null = null) => ({
  ok: true,
  json: () => Promise.resolve({ items, nextCursor }),
})

beforeEach(() => {
  window.history.replaceState(null, '', '/search?q=fire')
  const push = window.history.pushState.bind(window.history)
  vi.spyOn(window.history, 'pushState').mockImplementation((...args) => {
    push(...args)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('search experience', () => {
  it('renders video metadata and loads subsequent cursor pages without losing results', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response([episode('one')], 'page-2'))
      .mockResolvedValueOnce(response([episode('two')]))
    vi.stubGlobal('fetch', fetchMock)
    render(<SearchResults user={null} />)
    expect(
      await screen.findByRole('heading', { name: 'Fire one' }),
    ).toBeTruthy()
    expect(screen.getByText('조회 42 · 좋아요 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '검색 결과 더 보기' }))
    expect(
      await screen.findByRole('heading', { name: 'Fire two' }),
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Fire one' })).toBeTruthy()
    expect(fetchMock.mock.calls[1]?.[0]).toContain('cursor=page-2')
    expect(
      screen.queryByRole('button', { name: '검색 결과 더 보기' }),
    ).toBeNull()
  })

  it('updates the URL on submit, trims whitespace, and restores searches on navigation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([])))
    render(<SearchResults user={null} />)
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: '  moon  ' },
    })
    fireEvent.submit(screen.getByRole('search'))
    await waitFor(() => {
      expect(window.location.search).toBe('?q=moon&type=episode')
    })
    act(() => {
      window.history.replaceState(null, '', '/search?q=fire&type=series')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await waitFor(() => {
      expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe('fire')
    })
    expect(
      screen.getByRole('tab', { name: '시리즈' }).getAttribute('aria-selected'),
    ).toBe('true')
  })

  it('changes category without submitting an unfinished search draft', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([]))
    vi.stubGlobal('fetch', fetchMock)
    render(<SearchResults user={null} />)
    await screen.findByText('검색 결과가 없습니다')
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'draft' },
    })
    fireEvent.mouseDown(screen.getByRole('tab', { name: '크리에이터' }), {
      button: 0,
      ctrlKey: false,
    })
    await waitFor(() => {
      expect(window.location.search).toBe('?q=fire&type=user')
    })
    expect(fetchMock.mock.calls.at(-1)?.[0]).toContain('q=fire&type=user')
  })

  it.each(['', '?q=x', `?q=${'a'.repeat(51)}`])(
    'does not request invalid queries: %s',
    (search) => {
      window.history.replaceState(null, '', `/search${search}`)
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      render(<SearchResults user={null} />)
      expect(fetchMock).not.toHaveBeenCalled()
      expect(screen.getByRole('link', { name: /작품 둘러보기/u })).toBeTruthy()
    },
  )

  it('clears the input and returns keyboard focus to it', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([])))
    render(<SearchResults user={null} />)
    fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }))
    expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe('')
    expect(document.activeElement).toBe(screen.getByRole('searchbox'))
  })

  it('preserves visible results and retries a failed next page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response([episode('one')], 'next'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response([episode('two')]))
    vi.stubGlobal('fetch', fetchMock)
    render(<SearchResults user={null} />)
    fireEvent.click(
      await screen.findByRole('button', { name: '검색 결과 더 보기' }),
    )
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Fire one' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
    expect(
      await screen.findByRole('heading', { name: 'Fire two' }),
    ).toBeTruthy()
  })

  it('renders series posters, creator details and partner film destinations', async () => {
    window.history.replaceState(null, '', '/search?q=thread&type=series')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response([
          {
            type: 'series',
            id: 'higgsfield:thread',
            title: 'THREAD',
            slug: 'thread',
            posterUrl: null,
            creator,
          },
        ]),
      ),
    )
    render(<SearchResults user={null} />)
    const link = await screen.findByRole('link', { name: /THREAD/u })
    expect(link.getAttribute('href')).toBe('/watch/higgsfield/thread')
    expect(screen.getByText('포스터 준비 중')).toBeTruthy()
    expect(screen.getByText('제작자')).toBeTruthy()
  })

  it('renders creator profiles and follower counts', async () => {
    window.history.replaceState(null, '', '/search?q=creator&type=user')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response([{ type: 'user', ...creator, followerCount: 1234 }]),
        ),
    )
    render(<SearchResults user={null} />)
    expect(
      (
        await screen.findByRole('link', { name: /팔로워 1,234명/u })
      ).getAttribute('href'),
    ).toBe('/u/creator')
  })

  it('shows a recoverable error when the API returns invalid data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [{}], nextCursor: null }),
      }),
    )
    render(<SearchResults user={null} />)
    expect(
      await screen.findByText(
        '검색 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      ),
    ).toBeTruthy()
  })
})
