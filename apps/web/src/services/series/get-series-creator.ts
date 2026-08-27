import { AppError, type PublicUserSummary } from '@aidream/core'
import { findUserById } from '@aidream/db'
import { avatarUrl } from '@aidream/storage/cdn'

/**
 * 작품 상세·재생 화면의 "작가" 표시. `PublicUserSummary` 를 그대로 쓴다 —
 * 등급 배지를 그리는 컴포넌트가 피드·댓글과 같은 타입을 받아야 한다.
 */
export type SeriesCreator = PublicUserSummary

export async function getSeriesCreator(
  ownerId: string,
): Promise<SeriesCreator> {
  const user = await findUserById(ownerId)
  if (user === null) throw new AppError('E_USER_NOT_FOUND')
  return {
    handle: user.handle,
    displayName: user.displayName,
    avatarUrl: avatarUrl(user.avatarKey),
    tier: user.tier,
    isVerified: user.verifiedAt !== null,
  }
}
