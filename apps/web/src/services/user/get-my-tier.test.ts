import type { TierActivitySnapshot } from '@aidream/db'
import { describe, expect, it, vi } from 'vitest'

import { getMyTier, type GetMyTierDependencies } from './get-my-tier'

const NOW = new Date('2026-10-07T00:00:00.000Z')

function snapshot(
  overrides: Partial<TierActivitySnapshot> = {},
): TierActivitySnapshot {
  return {
    role: 'CREATOR',
    tier: 'BRONZE',
    tierPoints: 0,
    tierEvaluatedAt: null,
    createdAt: NOW,
    followerCount: 0,
    totalViews: 0,
    episodesPublished: 0,
    watchSeconds: 0,
    commentsPosted: 0,
    likesGiven: 0,
    ...overrides,
  }
}

function dependencies(
  value: TierActivitySnapshot | null,
): GetMyTierDependencies {
  return { read: vi.fn().mockResolvedValue(value), now: () => NOW }
}

describe('getMyTier', () => {
  it('keeps the applied tier and reports the tier live activity reaches', async () => {
    // 팔로워 300 + 회차 5편(200) + 가입 10일(20) = 520점 → SILVER
    const result = await getMyTier(
      'u1',
      dependencies(
        snapshot({
          followerCount: 300,
          episodesPublished: 5,
          createdAt: new Date(NOW.getTime() - 10 * 86_400_000),
        }),
      ),
    )

    expect(result).toMatchObject({
      role: 'CREATOR',
      appliedTier: 'BRONZE',
      computedTier: 'SILVER',
      points: 520,
      nextTier: 'GOLD',
      pointsToNext: 4_480,
      evaluatedAt: null,
      computedAt: NOW.toISOString(),
    })
    expect(result.progress).toBeCloseTo(20 / 4_500)
  })

  it('does not demote on view when live points fall below the stored tier', async () => {
    const evaluatedAt = new Date('2026-10-01T00:00:00.000Z')
    const result = await getMyTier(
      'u1',
      dependencies(
        snapshot({
          tier: 'SILVER',
          likesGiven: 12,
          tierEvaluatedAt: evaluatedAt,
        }),
      ),
    )

    expect(result).toMatchObject({
      appliedTier: 'SILVER',
      computedTier: 'BRONZE',
      points: 12,
      evaluatedAt: evaluatedAt.toISOString(),
    })
  })

  it('reports full progress at the top tier', async () => {
    const result = await getMyTier(
      'u1',
      dependencies(
        snapshot({
          followerCount: 50_000,
          totalViews: 6_000_000,
          tier: 'DIAMOND',
        }),
      ),
    )
    expect(result).toMatchObject({
      computedTier: 'DIAMOND',
      nextTier: null,
      pointsToNext: null,
      progress: 1,
    })
  })

  it('fails with E_USER_NOT_FOUND for a missing account', async () => {
    await expect(getMyTier('gone', dependencies(null))).rejects.toMatchObject({
      code: 'E_USER_NOT_FOUND',
    })
  })
})
