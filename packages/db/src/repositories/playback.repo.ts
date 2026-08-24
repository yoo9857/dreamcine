import type { AgeRating, AssetStatus, EpisodeStatus } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

export interface PlaybackRenditionRecord {
  readonly name: string
  readonly width: number
  readonly height: number
}

export interface PlaybackEpisodeRecord {
  readonly id: string
  readonly ownerId: string
  readonly status: EpisodeStatus
  readonly ageRating: AgeRating
  readonly asset: {
    readonly id: string
    readonly status: AssetStatus
    readonly durationSec: number | null
    readonly posterKey: string | null
    readonly renditions: readonly PlaybackRenditionRecord[]
  } | null
}

export interface WatchProgressRecord {
  readonly userId: string
  readonly episodeId: string
  readonly positionSec: number
  readonly completed: boolean
  readonly updatedAt: Date
}

export interface SaveWatchProgressData {
  readonly userId: string
  readonly episodeId: string
  readonly positionSec: number
  readonly completed: boolean
}

export function findPlaybackEpisode(
  _episodeId: string,
): Promise<PlaybackEpisodeRecord | null> {
  throw new NotImplementedError('T07:findPlaybackEpisode')
}

export function hasBlockBetween(
  _firstUserId: string,
  _secondUserId: string,
): Promise<boolean> {
  throw new NotImplementedError('T07:hasBlockBetween')
}

export function findWatchProgress(
  _userId: string,
  _episodeId: string,
): Promise<WatchProgressRecord | null> {
  throw new NotImplementedError('T07:findWatchProgress')
}

export function upsertWatchProgress(
  _input: SaveWatchProgressData,
): Promise<void> {
  throw new NotImplementedError('T07:upsertWatchProgress')
}
