import { AppError, type SaveProgressInput } from '@aidream/core'
import { findPlaybackEpisode, upsertWatchProgress } from '@aidream/db'
import type { RouteSession } from '@/src/auth/types'

export interface SaveProgressServiceInput {
  readonly episodeId: string
  readonly progress: SaveProgressInput
  readonly session: RouteSession
  readonly now: Date
}
export async function saveProgress(
  input: SaveProgressServiceInput,
): Promise<void> {
  if ((await findPlaybackEpisode(input.episodeId)) === null)
    throw new AppError('E_EPISODE_NOT_FOUND')
  await upsertWatchProgress({
    userId: input.session.userId,
    episodeId: input.episodeId,
    positionSec: input.progress.positionSec,
    completed: input.progress.completed ?? false,
  })
}
