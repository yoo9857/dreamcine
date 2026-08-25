import { AppError } from '@aidream/core'
import {
  findPlaybackEpisode,
  hasBlockBetween,
  likeEpisode,
  unlikeEpisode,
} from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'
import { getLogger } from '@/src/lib/logger'
import { notify } from '@/src/services/notification/notify'

export interface LikeResult {
  readonly likeCount: number
  readonly liked: boolean
}

export interface ToggleLikeDependencies {
  readonly findEpisode: typeof findPlaybackEpisode
  readonly blocked: typeof hasBlockBetween
  readonly add: typeof likeEpisode
  readonly remove: typeof unlikeEpisode
  readonly notify: typeof notify
}

export function addLike(
  session: RouteSession,
  episodeId: string,
  dependencies: ToggleLikeDependencies = productionDependencies(),
): Promise<LikeResult> {
  return runAddLike(session, episodeId, dependencies)
}

async function runAddLike(
  session: RouteSession,
  episodeId: string,
  dependencies: ToggleLikeDependencies,
): Promise<LikeResult> {
  const episode = await visibleEpisode(session, episodeId, dependencies)
  const result = await dependencies.add(session.userId, episodeId)
  if (result.created) {
    try {
      await dependencies.notify({
        type: 'NEW_LIKE',
        to: episode.ownerId,
        actorId: session.userId,
        episodeId,
      })
    } catch (error: unknown) {
      getLogger().error(
        { err: error, actorId: session.userId, episodeId },
        'like notification failed',
      )
    }
  }
  return { liked: true, likeCount: result.likeCount }
}

export function removeLike(
  session: RouteSession,
  episodeId: string,
  dependencies: ToggleLikeDependencies = productionDependencies(),
): Promise<LikeResult> {
  return runRemoveLike(session, episodeId, dependencies)
}

async function runRemoveLike(
  session: RouteSession,
  episodeId: string,
  dependencies: ToggleLikeDependencies,
): Promise<LikeResult> {
  await visibleEpisode(session, episodeId, dependencies)
  const result = await dependencies.remove(session.userId, episodeId)
  return { liked: false, likeCount: result.likeCount }
}

async function visibleEpisode(
  session: RouteSession,
  episodeId: string,
  dependencies: ToggleLikeDependencies,
) {
  const episode = await dependencies.findEpisode(episodeId)
  if (episode === null || episode.status !== 'PUBLISHED')
    throw new AppError('E_EPISODE_NOT_FOUND')
  if (await dependencies.blocked(session.userId, episode.ownerId))
    throw new AppError('E_SOCIAL_BLOCKED')
  return episode
}

function productionDependencies(): ToggleLikeDependencies {
  return {
    findEpisode: findPlaybackEpisode,
    blocked: hasBlockBetween,
    add: likeEpisode,
    remove: unlikeEpisode,
    notify,
  }
}
