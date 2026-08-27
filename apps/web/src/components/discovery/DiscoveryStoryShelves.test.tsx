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
  it('renders five compact discovery rows with live and curated artwork', () => {
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
    ).toBe(30)
    expect(
      screen.getAllByRole('link', { name: '실시간 인기 작품 보기' }).length,
    ).toBe(5)
    expect(
      screen.getAllByRole('link', { name: '내일의 기억 보기' }).length,
    ).toBe(5)
  })
})
