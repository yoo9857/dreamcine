import { AppError, can, type PlaybackResponse } from '@aidream/core'
import {
  findPlaybackEpisode,
  findWatchProgress,
  hasBlockBetween,
} from '@aidream/db'
import { masterUrl, thumbUrl } from '@aidream/storage/cdn'
import type { RouteSession } from '@/src/auth/types'
import { verifyAgeVerification } from '@/src/lib/age-verification'

export interface GetPlaybackInput {
  readonly episodeId: string
  readonly session: RouteSession | null
  readonly cookieHeader: string | null
  readonly now: Date
}

export async function getPlayback(
  input: GetPlaybackInput,
): Promise<PlaybackResponse> {
  const episode = await findPlaybackEpisode(input.episodeId)
  if (episode === null) throw new AppError('E_EPISODE_NOT_FOUND')
  const actor =
    input.session === null
      ? null
      : {
          id: input.session.userId,
          role: input.session.user.role,
          status: input.session.user.status,
          emailVerified: input.session.user.emailVerified,
        }
  if (
    episode.status !== 'PUBLISHED' &&
    (actor === null ||
      !can(actor, 'episode.hide', { ownerId: episode.ownerId }))
  ) {
    throw new AppError('E_EPISODE_NOT_PUBLISHED')
  }
  if (
    input.session !== null &&
    (await hasBlockBetween(input.session.userId, episode.ownerId))
  ) {
    throw new AppError('E_SOCIAL_BLOCKED')
  }
  if (episode.ageRating !== 'ALL') {
    const secret = process.env.AUTH_SECRET
    if (
      secret === undefined ||
      !verifyAgeVerification({
        cookieHeader: input.cookieHeader,
        episodeId: episode.id,
        ageRating: episode.ageRating,
        now: input.now,
        secret,
      })
    )
      throw new AppError('E_PERM_AGE_RESTRICTED')
  }
  const asset = episode.asset
  if (asset?.status !== 'READY' || asset.durationSec === null)
    throw new AppError('E_ASSET_NOT_READY')
  const progress =
    input.session === null
      ? null
      : await findWatchProgress(input.session.userId, episode.id)
  const completionWindowSec = Math.min(
    30,
    Math.max(5, Math.floor(asset.durationSec * 0.05)),
  )
  const startAtSec =
    progress !== null &&
    !progress.completed &&
    progress.positionSec > 0 &&
    asset.durationSec - progress.positionSec > completionWindowSec
      ? progress.positionSec
      : 0
  const hasSeekSprite = asset.renditions.some(
    (rendition) => rendition.name === '1080p',
  )
  return {
    episodeId: episode.id,
    masterUrl: masterUrl(asset.id),
    posterUrl: thumbUrl(asset.id),
    ...(hasSeekSprite
      ? {
          spriteUrl: thumbUrl(asset.id, 'sprite.jpg'),
          spriteVttUrl: thumbUrl(asset.id, 'sprite.vtt'),
        }
      : {}),
    durationSec: asset.durationSec,
    startAtSec,
    renditions: [...asset.renditions],
  }
}
