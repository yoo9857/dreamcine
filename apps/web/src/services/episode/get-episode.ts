import { AppError, can, type EpisodeResponse } from '@aidream/core'
import { findEpisodeForTransition } from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'

import { toEpisodeResponse } from './create-episode'

export async function getEpisode(
  episodeId: string,
  session: RouteSession | null,
): Promise<EpisodeResponse> {
  const record = await findEpisodeForTransition(episodeId)
  if (record === null) throw new AppError('E_EPISODE_NOT_FOUND')
  if (record.episode.status !== 'PUBLISHED') {
    if (session === null) throw new AppError('E_EPISODE_NOT_FOUND')
    const actor = {
      id: session.userId,
      role: session.user.role,
      status: session.user.status,
      emailVerified: session.user.emailVerified,
    }
    if (!can(actor, 'episode.update', { ownerId: record.ownerId })) {
      throw new AppError('E_EPISODE_NOT_FOUND')
    }
  }
  return toEpisodeResponse(record.episode)
}
