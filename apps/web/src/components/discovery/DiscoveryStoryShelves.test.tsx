// @vitest-environment jsdom
import type { FeedItem } from '@aidream/core'
import { cleanup, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { DiscoveryStoryShelves } from './DiscoveryStoryShelves'
afterEach(cleanup)
const item: FeedItem = {
  episodeId: 'live',
  title: '공개 작품',
  thumbUrl: '/brand/posters/memory.png',
  durationSec: 120,
  ageRating: 'ALL',
  viewCount: '1200',
  likeCount: 3,
  publishedAt: '2026-08-27T00:00:00.000Z',
  series: { id: 'series', title: '시리즈', slug: 'series' },
  creator: {
    handle: 'creator',
    displayName: '작가',
    avatarUrl: null,
    tier: 'BRONZE',
    isVerified: false,
  },
  isLiked: false,
}
it('opens real collections instead of empty keyword searches', () => {
  render(
    <DiscoveryStoryShelves
      items={[item]}
      latestItems={[
        item,
        {
          ...item,
          episodeId: 'short',
          title: '숏폼 작품',
          aspectRatio: 9 / 16,
        },
      ]}
    />,
  )
  expect(
    screen
      .getAllByRole('link', { name: /모두 보기/u })
      .map((link) => link.getAttribute('href')),
  ).toEqual([
    '/works?sort=popular',
    '/works?sort=latest',
    '/works?format=long',
    '/works?format=short',
    '/u/higgsfield',
  ])
  expect(screen.queryByText('마음이 머무는 로맨스')).toBeNull()
})
it('keeps latest separate from popularity and excludes festival films from rankings', () => {
  render(
    <DiscoveryStoryShelves
      items={[item]}
      latestItems={[{ ...item, episodeId: 'new', title: '새 작품' }]}
    />,
  )
  const popular = screen.getByRole('region', {
    name: '지금 가장 많이 보는 이야기',
  })
  expect(
    within(popular).getByRole('link', { name: '공개 작품 보기' }),
  ).toBeTruthy()
  expect(
    within(popular).queryByRole('link', { name: '새 작품 보기' }),
  ).toBeNull()
  expect(
    within(popular).queryByRole('link', { name: 'THREAD 보기' }),
  ).toBeNull()
  expect(
    within(
      screen.getByRole('region', { name: '새로 올라온 이야기' }),
    ).getByRole('link', { name: '새 작품 보기' }),
  ).toBeTruthy()
})
it('shows only real festival works when no episodes exist', () => {
  const view = render(<DiscoveryStoryShelves items={[]} />)
  expect(view.container.querySelectorAll('.discovery-shelf')).toHaveLength(1)
  expect(
    screen.getByRole('link', { name: 'THREAD 보기' }).getAttribute('href'),
  ).toBe('/watch/higgsfield/thread')
  expect(screen.queryByRole('link', { name: '내일의 기억 보기' })).toBeNull()
})
it('ranks before limiting and keeps works without thumbnails available', () => {
  const view = render(
    <DiscoveryStoryShelves
      items={[
        item,
        {
          ...item,
          episodeId: 'most',
          title: '인기 작품',
          thumbUrl: null,
          viewCount: '9999',
        },
      ]}
    />,
  )
  const first = view.container.querySelector(
    '#shelf-track-trending .discovery-shelf-card a',
  )
  expect(first?.getAttribute('aria-label')).toBe('인기 작품 보기')
  expect(first?.querySelector('.discovery-shelf-rank')?.textContent).toBe('1')
  expect(first?.querySelector('.discovery-shelf-no-image')).not.toBeNull()
})
it('keeps short and long collections consistent with the selected work type', () => {
  render(
    <DiscoveryStoryShelves
      items={[
        item,
        {
          ...item,
          episodeId: 'short',
          title: '선언된 숏폼',
          series: { ...item.series, workType: 'SHORT_FORM' },
        },
      ]}
    />,
  )
  const short = screen.getByRole('region', { name: '짧게 발견하는 숏폼' })
  expect(
    within(short).getByRole('link', { name: '선언된 숏폼 보기' }),
  ).toBeTruthy()
  expect(
    within(short).queryByRole('link', { name: '공개 작품 보기' }),
  ).toBeNull()
  expect(
    within(
      screen.getByRole('region', { name: '깊이 몰입하는 롱폼' }),
    ).queryByRole('link', { name: '선언된 숏폼 보기' }),
  ).toBeNull()
})
