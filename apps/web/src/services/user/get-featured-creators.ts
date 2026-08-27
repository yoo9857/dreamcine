import type { PublicUserSummary } from '@aidream/core'
import { listFeaturedCreators } from '@aidream/db'
import { avatarUrl } from '@aidream/storage/cdn'

/**
 * `PublicUserSummary` 를 확장한다 — 등급 배지를 그리는 컴포넌트가 피드·댓글과
 * 같은 타입을 받아야 화면마다 배지 규칙이 갈라지지 않는다.
 */
export interface CreatorDirectoryItem extends PublicUserSummary {
  readonly bio: string | null
  readonly followerCount: number
  readonly seriesCount: number
}

export async function getFeaturedCreators(
  limit = 24,
): Promise<readonly CreatorDirectoryItem[]> {
  const creators = await listFeaturedCreators(limit)
  return creators.map((creator) => ({
    handle: creator.handle,
    displayName: creator.displayName,
    bio: creator.bio,
    avatarUrl: avatarUrl(creator.avatarKey),
    tier: creator.tier,
    isVerified: creator.verifiedAt !== null,
    followerCount: creator.followerCount,
    seriesCount: creator.seriesCount,
  }))
}
