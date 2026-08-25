import {
  AppError,
  LIMITS,
  can,
  normalizeTag,
  type CreateEpisodeInput,
  type Episode,
  type EpisodeResponse,
} from '@aidream/core'
import {
  countEpisodesBySeries,
  createEpisodeWithTags,
  findAssetOwnership,
  findSeriesById,
} from '@aidream/db'
import { cdnUrl } from '@aidream/storage/cdn'

import type { RouteSession } from '@/src/auth/types'

export function createEpisode(
  session: RouteSession,
  input: CreateEpisodeInput,
): Promise<EpisodeResponse> {
  return runCreateEpisode(session, input)
}

async function runCreateEpisode(
  session: RouteSession,
  input: CreateEpisodeInput,
): Promise<EpisodeResponse> {
  const actor = {
    id: session.userId,
    role: session.user.role,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
  }
  if (!can(actor, 'episode.create')) {
    throw new AppError('E_PERM_DENIED', { action: 'episode.create' })
  }
  const series = await findSeriesById(input.seriesId)
  if (series === null) throw new AppError('E_SERIES_NOT_FOUND')
  if (series.ownerId !== session.userId) {
    throw new AppError('E_PERM_NOT_OWNER')
  }
  const episodeCount = await countEpisodesBySeries(series.id)
  if (episodeCount >= LIMITS.EPISODES_PER_SERIES) {
    throw new AppError('E_SERIES_LIMIT_EXCEEDED', {
      currentCount: episodeCount,
    })
  }
  const ownership = await findAssetOwnership(input.assetId)
  if (ownership === null || ownership.ownerId !== session.userId) {
    throw new AppError('E_ASSET_NOT_FOUND')
  }
  if (ownership.episodeId !== null) {
    throw new AppError('E_DB_CONFLICT', {
      fields: ['assetId'],
      reason: 'asset-already-linked',
    })
  }
  const tags = [...new Set((input.tags ?? []).map(normalizeTag))]
  if (tags.length > LIMITS.TAGS_PER_EPISODE) {
    throw new AppError('E_VALIDATION', { fields: ['tags'] })
  }
  const episode = await createEpisodeWithTags({
    seriesId: series.id,
    seasonNumber: input.seasonNumber ?? 1,
    number: input.number,
    title: input.title,
    description: input.description ?? null,
    assetId: ownership.asset.id,
    ageRating: input.ageRating,
    aiDisclosure: input.aiDisclosure,
    tags,
  })
  return toEpisodeResponse(episode)
}

export function toEpisodeResponse(episode: Episode): EpisodeResponse {
  return {
    id: episode.id,
    seriesId: episode.seriesId,
    seasonId: episode.seasonId,
    assetId: episode.assetId,
    number: episode.number,
    title: episode.title,
    description: episode.description,
    ...(episode.thumbKey === null
      ? {}
      : { thumbUrl: cdnUrl(episode.thumbKey) }),
    status: episode.status,
    ageRating: episode.ageRating,
    aiDisclosure: episode.aiDisclosure,
    publishAt: episode.publishAt?.toISOString() ?? null,
    publishedAt: episode.publishedAt?.toISOString() ?? null,
    viewCount: episode.viewCount,
    likeCount: episode.likeCount,
    commentCount: episode.commentCount,
    createdAt: episode.createdAt.toISOString(),
    updatedAt: episode.updatedAt.toISOString(),
  }
}
