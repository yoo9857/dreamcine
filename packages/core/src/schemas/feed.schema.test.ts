import { describe, expect, it } from 'vitest'

import {
  FeedPageSchema,
  FeedQuerySchema,
  SearchQuerySchema,
  SearchResultSchema,
} from './feed.schema.js'

const feedItem = {
  episodeId: 'episode_1',
  title: '첫 화',
  thumbUrl: 'https://cdn.example.com/thumb.jpg',
  durationSec: 120,
  ageRating: 'ALL',
  viewCount: '100',
  likeCount: 3,
  publishedAt: '2026-08-25T00:00:00.000Z',
  series: { id: 'series_1', title: '시리즈', slug: 'series' },
  creator: {
    handle: 'creator',
    displayName: '제작자',
    avatarUrl: null,
    tier: 'GOLD',
    isVerified: true,
  },
  isLiked: false,
}

describe('feed contracts', () => {
  it('applies feed query defaults and coerces the page size', () => {
    expect(FeedQuerySchema.parse({ limit: '50' })).toEqual({
      type: 'popular',
      limit: 50,
    })
  })

  it.each([{ limit: 0 }, { limit: 51 }, { type: 'unknown' }])(
    'rejects invalid feed query $type $limit',
    (query) => {
      expect(FeedQuerySchema.safeParse(query).success).toBe(false)
    },
  )

  it('requires a 2-50 character search term and an explicit type', () => {
    expect(
      SearchQuerySchema.safeParse({ q: 'a', type: 'episode' }).success,
    ).toBe(false)
    expect(
      SearchQuerySchema.safeParse({ q: '드라마', type: 'episode' }).success,
    ).toBe(true)
    expect(SearchQuerySchema.safeParse({ q: '드라마' }).success).toBe(false)
  })

  it('serializes a valid feed page and rejects numeric bigint leakage', () => {
    expect(
      FeedPageSchema.parse({ items: [feedItem], nextCursor: null }),
    ).toEqual({
      items: [feedItem],
      nextCursor: null,
    })
    expect(
      FeedPageSchema.safeParse({
        items: [{ ...feedItem, viewCount: 100 }],
        nextCursor: null,
      }).success,
    ).toBe(false)
  })

  it.each([
    {
      type: 'series',
      id: 's',
      title: '시리즈',
      slug: 'series',
      posterUrl: null,
      creator: feedItem.creator,
    },
    { type: 'episode', episode: feedItem },
    {
      type: 'user',
      handle: 'creator',
      displayName: '제작자',
      avatarUrl: null,
      followerCount: 1,
    },
  ])('accepts the $type search union member', (result) => {
    expect(SearchResultSchema.safeParse(result).success).toBe(true)
  })
})
