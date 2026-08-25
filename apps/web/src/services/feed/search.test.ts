import type { FeedRow } from '@aidream/db'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import {
  getTagFeed,
  getTrendingTags,
  search,
  type SearchServiceDependencies,
} from './search'

const now = new Date('2026-08-25T00:00:00.000Z')
const episode: FeedRow = {
  id: 'episode_1',
  seriesId: 'series_1',
  seasonId: null,
  assetId: null,
  number: 1,
  title: '드라마 첫 화',
  description: null,
  thumbKey: 'thumbs/e/thumb.jpg',
  status: 'PUBLISHED',
  ageRating: 'ALL',
  aiDisclosure: null,
  publishAt: null,
  publishedAt: now,
  viewCount: '10',
  likeCount: 1,
  commentCount: 0,
  rankScore: 1,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  creatorId: 'creator_1',
  seriesTitle: '드라마',
  seriesSlug: 'drama',
  creatorHandle: 'creator',
  creatorDisplayName: '제작자',
  creatorAvatarKey: null,
  durationSec: 60,
}
const session: RouteSession = {
  userId: 'viewer_1',
  user: {
    id: 'viewer_1',
    handle: 'viewer',
    email: 'viewer@example.com',
    displayName: '시청자',
    role: 'VIEWER',
    status: 'ACTIVE',
    emailVerified: true,
  },
  expiresAt: now,
}

function dependencies(): SearchServiceDependencies {
  return {
    searchCatalog: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    tagFeed: vi.fn().mockResolvedValue({ items: [episode], nextCursor: null }),
    trendingTags: vi.fn().mockResolvedValue([{ name: 'AI', useCount: 3 }]),
    likedIds: vi.fn().mockResolvedValue(new Set<string>()),
    blockedCreatorIds: vi.fn().mockResolvedValue(new Set<string>()),
    readCache: vi.fn().mockResolvedValue(null),
    writeCache: vi.fn().mockResolvedValue(undefined),
  }
}

describe('feed search services', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CDN_BASE_URL = 'https://cdn.example.com'
  })

  it('maps episode search rows and batches the viewer likes', async () => {
    const deps = dependencies()
    vi.mocked(deps.searchCatalog).mockResolvedValue({
      items: [{ type: 'episode', episode }],
      nextCursor: null,
    })
    vi.mocked(deps.likedIds).mockResolvedValue(new Set([episode.id]))

    await expect(
      search({ q: '드라마', type: 'episode', limit: 20 }, session, deps),
    ).resolves.toMatchObject({
      items: [
        { type: 'episode', episode: { episodeId: episode.id, isLiked: true } },
      ],
    })
    expect(deps.likedIds).toHaveBeenCalledWith(session.userId, [episode.id])
  })

  it('serves a tag page when Redis is unavailable', async () => {
    const deps = dependencies()
    vi.mocked(deps.readCache).mockRejectedValue(new Error('redis down'))

    await expect(
      getTagFeed('AI', { limit: 20 }, null, deps),
    ).resolves.toMatchObject({
      items: [{ episodeId: episode.id }],
    })
    expect(deps.tagFeed).toHaveBeenCalledOnce()
  })

  it('caches trending tags for five minutes', async () => {
    const deps = dependencies()
    await expect(getTrendingTags(deps)).resolves.toEqual({
      items: [{ name: 'AI', useCount: 3 }],
    })
    expect(deps.writeCache).toHaveBeenCalledWith(
      'tags:trending:20',
      JSON.stringify([{ name: 'AI', useCount: 3 }]),
      300,
    )
  })
})
