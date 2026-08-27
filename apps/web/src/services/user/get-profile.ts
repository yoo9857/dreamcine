import { AppError, type UserProfile } from '@aidream/core'
import {
  findUserByHandle,
  getUserSocialState,
  listUserLinks,
} from '@aidream/db'
import { avatarUrl, cdnUrl } from '@aidream/storage/cdn'

import type { RouteSession } from '@/src/auth/types'

export interface GetProfileDependencies {
  readonly find: typeof findUserByHandle
  readonly socialState: typeof getUserSocialState
  readonly links: typeof listUserLinks
}

export function getProfile(
  handle: string,
  session: RouteSession | null,
  dependencies: GetProfileDependencies = {
    find: findUserByHandle,
    socialState: getUserSocialState,
    links: listUserLinks,
  },
): Promise<UserProfile> {
  return runGetProfile(handle, session, dependencies)
}

/**
 * 배너는 CDN 이 설정되지 않은 환경에서도 프로필이 떠야 하므로 실패를 삼킨다.
 * 아바타는 `avatarUrl` 이 이미 null 을 다룬다.
 */
function bannerUrl(bannerKey: string | null): string | null {
  if (bannerKey === null || bannerKey === '') return null
  try {
    return cdnUrl(bannerKey)
  } catch {
    return null
  }
}

async function runGetProfile(
  handle: string,
  session: RouteSession | null,
  dependencies: GetProfileDependencies,
): Promise<UserProfile> {
  const user = await dependencies.find(handle)
  if (user === null) throw new AppError('E_USER_NOT_FOUND')

  /*
    비공개 프로필은 본인에게만 보인다. `PRIVATE` 을 404 로 돌리는 이유:
    403 은 "그 핸들의 계정이 존재한다" 를 알려준다. 존재 여부 자체가
    감추려는 대상이다.
  */
  const isSelf = session !== null && session.userId === user.id
  if (user.profileVisibility === 'PRIVATE' && !isSelf) {
    throw new AppError('E_USER_NOT_FOUND')
  }

  const [state, links] = await Promise.all([
    isSelf || session === null
      ? Promise.resolve({ isFollowing: false, isBlocked: false })
      : dependencies.socialState(session.userId, user.id),
    dependencies.links(user.id),
  ])

  return {
    handle: user.handle,
    displayName: user.displayName,
    bio: user.bio,
    channelDescription: user.channelDescription,
    avatarUrl: avatarUrl(user.avatarKey),
    bannerUrl: bannerUrl(user.bannerKey),
    channelKeywords: user.channelKeywords,
    country: user.country,
    locale: user.locale,
    isVerified: user.verifiedAt !== null,
    role: user.role,
    tier: user.tier,
    // 배지 여부는 내려보내지 않는다. `TIER_ALLOWANCE[tier].badge` 로 유도되는
    // 값이라 같이 실으면 두 값이 갈라질 수 있고, 갈라진 쪽이 화면에 뜬다.
    tierPoints: user.tierPoints,
    // 본인은 자기 숫자를 항상 본다. 숨김은 남에게 감추는 설정이다.
    followerCount:
      user.hideFollowerCount && !isSelf ? null : user.followerCount,
    followingCount: user.followingCount,
    seriesCount: user.seriesCount,
    episodeCount: user.episodeCount,
    totalViews: user.totalViews,
    joinedAt: user.createdAt,
    trailerEpisodeId: user.trailerEpisodeId,
    links,
    ...state,
  }
}
