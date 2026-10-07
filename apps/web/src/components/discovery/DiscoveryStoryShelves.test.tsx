// @vitest-environment jsdom

import type { FeedItem } from '@aidream/core'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { DiscoveryStoryShelves } from './DiscoveryStoryShelves'

afterEach(cleanup)

const liveItem: FeedItem = {
  episodeId: 'episode-live',
  title: '실시간 인기 작품',
  thumbUrl: '/brand/posters/memory.png',
  durationSec: 120,
  ageRating: 'A12',
  viewCount: '1200',
  likeCount: 33,
  publishedAt: '2026-08-27T00:00:00.000Z',
  series: { id: 'series-live', title: '라이브 시리즈', slug: 'live' },
  creator: {
    handle: 'hanbin',
    displayName: '한빈',
    avatarUrl: null,
    tier: 'BRONZE',
    isVerified: false,
  },
  isLiked: false,
}

describe('DiscoveryStoryShelves', () => {
  it('renders five compact discovery rows with live and festival artwork', () => {
    const view = render(<DiscoveryStoryShelves items={[liveItem]} />)

    expect(
      screen.getByRole('heading', { name: '지금 가장 많이 보는 이야기' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: '언제나 사랑받는 이야기' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: '마음이 머무는 로맨스' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: '한 장면씩 깊어지는 드라마' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: '오늘 밤을 위한 영화' }),
    ).toBeTruthy()
    expect(
      view.container.querySelectorAll('.discovery-shelf-card').length,
    ).toBe(15)
    expect(
      screen.getAllByRole('link', { name: '실시간 인기 작품 보기' }).length,
    ).toBe(5)
    expect(screen.getAllByRole('link', { name: 'THREAD 보기' }).length).toBe(5)
    expect(screen.queryByRole('link', { name: '내일의 기억 보기' })).toBeNull()
  })

  it('uses playable festival films when nothing is published', () => {
    render(<DiscoveryStoryShelves items={[]} />)

    expect(screen.getAllByRole('link', { name: 'THREAD 보기' }).length).toBe(5)
    expect(screen.queryByRole('link', { name: '내일의 기억 보기' })).toBeNull()
  })

  it('fills the ranked row with festival films after published works', () => {
    const titles = [
      'ohhanbin_opt',
      'fly',
      'in seoul',
      'Breathe No More',
      'fight',
      'lip balm',
    ]
    const views = ['6', '1', '1', '1', '0', '0']
    const items = titles.map((title, index) => ({
      ...liveItem,
      episodeId: `episode-${String(index)}`,
      title,
      viewCount: views[index] ?? '0',
    }))
    const view = render(<DiscoveryStoryShelves items={items} />)

    const trending = view.container.querySelector('#shelf-track-trending')
    expect(trending).not.toBeNull()
    if (trending === null) return
    const labels = [
      ...trending.querySelectorAll<HTMLAnchorElement>(
        '.discovery-shelf-card a',
      ),
    ].map((anchor) => anchor.getAttribute('aria-label'))
    expect(labels).toEqual([
      'ohhanbin_opt 보기',
      'fly 보기',
      'in seoul 보기',
      'Breathe No More 보기',
      'fight 보기',
      'lip balm 보기',
      'THREAD 보기',
      'Borrowed Wounds 보기',
    ])

    const thread = trending.querySelector('a[aria-label="THREAD 보기"]')
    expect(thread?.getAttribute('href')).toBe('/watch/higgsfield/thread')
    expect(thread?.querySelector('small')).toBeNull()
    const wounds = trending.querySelector(
      'a[aria-label="Borrowed Wounds 보기"]',
    )
    expect(wounds?.getAttribute('href')).toBe(
      '/watch/higgsfield/borrowed-wounds',
    )
    expect(screen.queryByRole('link', { name: '내일의 기억 보기' })).toBeNull()
    expect(
      screen.queryByRole('link', { name: '사라지는 도시의 밤 보기' }),
    ).toBeNull()
  })

  it('ranks the trending row by views, not feed order', () => {
    const quiet = {
      ...liveItem,
      episodeId: 'quiet',
      title: '조용한 작품',
      viewCount: '0',
    }
    const popular = {
      ...liveItem,
      episodeId: 'popular',
      title: '인기 작품',
      viewCount: '5000',
    }
    const view = render(<DiscoveryStoryShelves items={[quiet, popular]} />)

    const trending = view.container.querySelector('#shelf-track-trending')
    const first = trending?.querySelector('.discovery-shelf-card a')
    expect(first?.getAttribute('aria-label')).toBe('인기 작품 보기')
    expect(first?.querySelector('.discovery-shelf-rank')?.textContent).toBe('1')
  })

  it('lists short-form cards on a 9:16 rail', () => {
    const vertical: FeedItem = {
      ...liveItem,
      episodeId: 'vertical',
      title: '세로 영상',
      viewCount: '3',
      aspectRatio: 9 / 16,
    }
    const declaredShort: FeedItem = {
      ...liveItem,
      episodeId: 'declared-short',
      title: '선언된 숏폼',
      viewCount: '9',
      aspectRatio: 16 / 9,
      series: { ...liveItem.series, workType: 'SHORT_FORM' },
    }
    const view = render(
      <DiscoveryStoryShelves items={[vertical, declaredShort, liveItem]} />,
    )

    const wide = view.container.querySelector('#shelf-track-trending')
    expect(wide?.classList.contains('is-portrait')).toBe(false)
    expect(wide?.querySelector('[aria-label="세로 영상 보기"]')).toBeNull()
    expect(wide?.querySelector('[aria-label="선언된 숏폼 보기"]')).toBeNull()
    expect(
      wide?.querySelector('[aria-label="실시간 인기 작품 보기"]'),
    ).not.toBeNull()

    const portrait = view.container.querySelector('#shelf-track-trending-short')
    expect(portrait).not.toBeNull()
    if (portrait === null) return
    expect(portrait.classList.contains('is-portrait')).toBe(true)
    const labels = [
      ...portrait.querySelectorAll<HTMLAnchorElement>(
        '.discovery-shelf-card a',
      ),
    ].map((anchor) => anchor.getAttribute('aria-label'))
    expect(labels).toEqual(['선언된 숏폼 보기', '세로 영상 보기'])
  })
})
