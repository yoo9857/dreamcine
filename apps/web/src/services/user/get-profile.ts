import { AppError, type UserProfile } from '@aidream/core'
import { findUserByHandle, getUserSocialState } from '@aidream/db'
import { avatarUrl } from '@aidream/storage/cdn'

import type { RouteSession } from '@/src/auth/types'

export interface GetProfileDependencies {
  readonly find: typeof findUserByHandle
  readonly socialState: typeof getUserSocialState
}

export function getProfile(
  handle: string,
  session: RouteSession | null,
  dependencies: GetProfileDependencies = {
    find: findUserByHandle,
    socialState: getUserSocialState,
  },
): Promise<UserProfile> {
  return runGetProfile(handle, session, dependencies)
}

async function runGetProfile(
  handle: string,
  session: RouteSession | null,
  dependencies: GetProfileDependencies,
): Promise<UserProfile> {
  const user = await dependencies.find(handle)
  if (user === null) throw new AppError('E_USER_NOT_FOUND')
  const state =
    session === null || session.userId === user.id
      ? { isFollowing: false, isBlocked: false }
      : await dependencies.socialState(session.userId, user.id)
  return {
    handle: user.handle,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: avatarUrl(user.avatarKey),
    followerCount: user.followerCount,
    seriesCount: user.seriesCount,
    ...state,
  }
}
