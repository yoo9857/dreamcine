import { AppError, type PublicUserSummary } from '@aidream/core'
import { findUserByHandle, listRelatedCreators } from '@aidream/db'
import { avatarUrl } from '@aidream/storage/cdn'

export interface RelatedCreator extends PublicUserSummary {
  readonly followerCount: number
  readonly seriesCount: number
}

export async function getRelatedCreators(
  handle: string,
): Promise<readonly RelatedCreator[]> {
  const user = await findUserByHandle(handle)
  if (user === null) throw new AppError('E_USER_NOT_FOUND')

  const creators = await listRelatedCreators(user.id, 4)
  return creators.map((creator) => ({
    handle: creator.handle,
    displayName: creator.displayName,
    avatarUrl: avatarUrl(creator.avatarKey),
    tier: creator.tier,
    isVerified: creator.verifiedAt !== null,
    followerCount: creator.followerCount,
    seriesCount: creator.seriesCount,
  }))
}
