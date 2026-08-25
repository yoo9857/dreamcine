import type { FeedQuery } from '@aidream/core'
import type { FeedRow } from '@aidream/db'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import { getFeed, type FeedServiceDependencies } from './get-feed'

const now = new Date('2026-08-25T00:00:00.000Z')
const row: FeedRow = {
  id: 'episode_1',
  seriesId: 'series_1',
  seasonId: null,
  assetId: 'asset_1',
  number: 1,
  title: '첫 화',
  description: null,
  thumbKey: null,
  status: 'PUBLISHED',
  ageRating: 'ALL',
  aiDisclosure: null,
  publishAt: null,
  publishedAt: now,
  viewCount: '100',
  likeCount: 3,
  commentCount: 1,
  rankScore: 10,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  creatorId: 'creator_1',
  seriesTitle: '시리즈',
  seriesSlug: 'series',
  creatorHandle: 'creator',
  creatorDisplayName: '제작자',
  creatorAvatarKey: null,
  durationSec: 120,
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

function dependencies(): FeedServiceDependencies {
  return {
    readCache: vi.fn().mockResolvedValue(null),
    writeCache: vi.fn().mockResolvedValue(undefined),
    popular: vi.fn().mockResolvedValue({ items: [row], nextCursor: null }),
    latest: vi.fn().mockResolvedValue({ items: [row], nextCursor: null }),
    following: vi.fn().mockResolvedValue({ items: [row], nextCursor: null }),
    likedIds: vi.fn().mockResolvedValue(new Set<string>()),
    blockedCreatorIds: vi.fn().mockResolvedValue(new Set<string>()),
  }
}

describe('getFeed', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CDN_BASE_URL = 'https://cdn.example.com'
  })

  it('caches a public first page and applies likes in one batch', async () => {
    const deps = dependencies()
    vi.mocked(deps.likedIds).mockResolvedValue(new Set([row.id]))
    const query: FeedQuery = { type: 'popular', limit: 20 }

    await expect(getFeed(query, session, deps)).resolves.toMatchObject({
      items: [
        {
          episodeId: row.id,
          thumbUrl: 'https://cdn.example.com/thumbs/asset_1/thumb.jpg',
          isLiked: true,
        },
      ],
    })
    expect(deps.writeCache).toHaveBeenCalledWith(
      'feed:popular:20',
      expect.any(String),
      60,
    )
    expect(deps.likedIds).toHaveBeenCalledOnce()
  })

  it('bypasses a cache outage and still serves the database page', async () => {
    const deps = dependencies()
    vi.mocked(deps.readCache).mockRejectedValue(new Error('redis down'))

    await expect(
      getFeed({ type: 'latest', limit: 20 }, null, deps),
    ).resolves.toMatchObject({ items: [{ episodeId: row.id }] })
    expect(deps.latest).toHaveBeenCalledOnce()
  })

  it('removes blocked creators before returning a cached page', async () => {
    const deps = dependencies()
    vi.mocked(deps.blockedCreatorIds).mockResolvedValue(
      new Set([row.creatorId]),
    )

    await expect(
      getFeed({ type: 'popular', limit: 20 }, session, deps),
    ).resolves.toEqual({ items: [], nextCursor: null })
  })

  it('requires authentication for the following feed', async () => {
    const deps = dependencies()
    await expect(
      getFeed({ type: 'following', limit: 20 }, null, deps),
    ).rejects.toMatchObject({ code: 'E_AUTH_REQUIRED' })
    expect(deps.following).not.toHaveBeenCalled()
  })
})
