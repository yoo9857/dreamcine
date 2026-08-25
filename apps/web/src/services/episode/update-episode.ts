import {
  AppError,
  can,
  normalizeTag,
  type EpisodeResponse,
  type UpdateEpisodeInput,
} from '@aidream/core'
import {
  findAssetOwnership,
  findEpisodeForTransition,
  updateEpisodeWithTags,
} from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'

import { toEpisodeResponse } from './create-episode'

export async function updateEpisode(
  episodeId: string,
  session: RouteSession,
  input: UpdateEpisodeInput,
): Promise<EpisodeResponse> {
  const record = await findEpisodeForTransition(episodeId)
  if (record === null) throw new AppError('E_EPISODE_NOT_FOUND')
  const actor = {
    id: session.userId,
    role: session.user.role,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
  }
  if (!can(actor, 'episode.update', { ownerId: record.ownerId })) {
    throw new AppError('E_PERM_NOT_OWNER')
  }
  if (input.assetId !== undefined && input.assetId !== null) {
    const ownership = await findAssetOwnership(input.assetId)
    if (ownership === null || ownership.ownerId !== session.userId) {
      throw new AppError('E_ASSET_NOT_FOUND')
    }
    if (
      ownership.episodeId !== null &&
      ownership.episodeId !== record.episode.id
    ) {
      throw new AppError('E_DB_CONFLICT', {
        fields: ['assetId'],
        reason: 'asset-already-linked',
      })
    }
  }
  const tags =
    input.tags === undefined
      ? undefined
      : [...new Set(input.tags.map(normalizeTag))]
  const episode = await updateEpisodeWithTags(
    record.episode.id,
    {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.description === undefined
        ? {}
        : { description: input.description }),
      ...(input.thumbKey === undefined ? {} : { thumbKey: input.thumbKey }),
      ...(input.assetId === undefined ? {} : { assetId: input.assetId }),
      ...(input.ageRating === undefined ? {} : { ageRating: input.ageRating }),
      ...(input.aiDisclosure === undefined
        ? {}
        : { aiDisclosure: input.aiDisclosure }),
    },
    tags,
  )
  return toEpisodeResponse(episode)
}
