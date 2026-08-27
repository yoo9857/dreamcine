import { listFeaturedCreators } from '@aidream/db'
import { avatarUrl } from '@aidream/storage/cdn'

export interface CreatorDirectoryItem {
  readonly handle: string
  readonly displayName: string
  readonly bio: string | null
  readonly avatarUrl: string | null
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
    followerCount: creator.followerCount,
    seriesCount: creator.seriesCount,
  }))
}
