import { AppError } from '@aidream/core'
import {
  findUserByHandle,
  followUser as insertFollow,
  hasBlockBetween,
  unfollowUser as deleteFollow,
} from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'
import { getLogger } from '@/src/lib/logger'
import { notify } from '@/src/services/notification/notify'

export interface FollowUserDependencies {
  readonly findTarget: typeof findUserByHandle
  readonly blocked: typeof hasBlockBetween
  readonly follow: typeof insertFollow
  readonly notify: typeof notify
}

export interface UnfollowUserDependencies {
  readonly findTarget: typeof findUserByHandle
  readonly unfollow: typeof deleteFollow
}

export function followUser(
  session: RouteSession,
  handle: string,
  dependencies: FollowUserDependencies = {
    findTarget: findUserByHandle,
    blocked: hasBlockBetween,
    follow: insertFollow,
    notify,
  },
): Promise<{ readonly followerCount: number }> {
  return runFollowUser(session, handle, dependencies)
}

async function runFollowUser(
  session: RouteSession,
  handle: string,
  dependencies: FollowUserDependencies,
): Promise<{ readonly followerCount: number }> {
  const target = await dependencies.findTarget(handle)
  if (target === null) throw new AppError('E_USER_NOT_FOUND')
  if (target.id === session.userId) throw new AppError('E_USER_SELF_ACTION')
  if (await dependencies.blocked(session.userId, target.id))
    throw new AppError('E_SOCIAL_BLOCKED')

  const result = await dependencies.follow(session.userId, target.id)
  if (result.created) {
    try {
      await dependencies.notify({
        type: 'NEW_FOLLOWER',
        to: target.id,
        actorId: session.userId,
      })
    } catch (error: unknown) {
      getLogger().error(
        { err: error, actorId: session.userId, targetId: target.id },
        'follow notification failed',
      )
    }
  }
  return { followerCount: result.followerCount }
}

export function unfollowUser(
  session: RouteSession,
  handle: string,
  dependencies: UnfollowUserDependencies = {
    findTarget: findUserByHandle,
    unfollow: deleteFollow,
  },
): Promise<{ readonly followerCount: number }> {
  return runUnfollowUser(session, handle, dependencies)
}

async function runUnfollowUser(
  session: RouteSession,
  handle: string,
  dependencies: UnfollowUserDependencies,
): Promise<{ readonly followerCount: number }> {
  const target = await dependencies.findTarget(handle)
  if (target === null) throw new AppError('E_USER_NOT_FOUND')
  if (target.id === session.userId) throw new AppError('E_USER_SELF_ACTION')
  const result = await dependencies.unfollow(session.userId, target.id)
  return { followerCount: result.followerCount }
}
