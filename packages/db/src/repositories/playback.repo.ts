import type { AgeRating, AssetStatus, EpisodeStatus } from '@aidream/core'
import { db } from '../client.js'
import { executeDb } from '../errors.js'

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
  episodeId: string,
): Promise<PlaybackEpisodeRecord | null> {
  return executeDb(async () => {
    const row = await db.episode.findFirst({
      where: { id: episodeId, deletedAt: null },
      select: {
        id: true,
        status: true,
        ageRating: true,
        series: { select: { ownerId: true } },
        asset: {
          select: {
            id: true,
            status: true,
            durationSec: true,
            posterKey: true,
            renditions: {
              select: { name: true, width: true, height: true },
              orderBy: [{ height: 'asc' }, { bitrateKbps: 'asc' }],
            },
          },
        },
      },
    })
    if (row === null) return null
    return {
      id: row.id,
      ownerId: row.series.ownerId,
      status: row.status,
      ageRating: row.ageRating,
      asset: row.asset,
    }
  })
}

export function hasBlockBetween(
  firstUserId: string,
  secondUserId: string,
): Promise<boolean> {
  return executeDb(async () => {
    const block = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: firstUserId, blockedId: secondUserId },
          { blockerId: secondUserId, blockedId: firstUserId },
        ],
      },
      select: { blockerId: true },
    })
    return block !== null
  })
}

export function findWatchProgress(
  userId: string,
  episodeId: string,
): Promise<WatchProgressRecord | null> {
  return executeDb(() =>
    db.watchProgress.findUnique({
      where: { userId_episodeId: { userId, episodeId } },
    }),
  )
}

export function upsertWatchProgress(
  input: SaveWatchProgressData,
): Promise<void> {
  return executeDb(async () => {
    await db.watchProgress.upsert({
      where: {
        userId_episodeId: {
          userId: input.userId,
          episodeId: input.episodeId,
        },
      },
      create: input,
      update: {
        positionSec: input.positionSec,
        completed: input.completed,
      },
    })
  })
}
