import {
  AppError,
  type AgeRating,
  type AssetStatus,
  type EpisodeStatus,
} from '@aidream/core'
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
    await db.$transaction(async (tx) => {
      const episode = await tx.episode.findFirst({
        where: { id: input.episodeId, deletedAt: null },
        select: { durationSec: true, asset: { select: { durationSec: true } } },
      })
      if (episode === null) throw new AppError('E_EPISODE_NOT_FOUND')
      const durationSec = episode.durationSec ?? episode.asset?.durationSec
      const positionSec =
        durationSec === null || durationSec === undefined
          ? input.positionSec
          : Math.min(input.positionSec, Math.max(0, durationSec))

      await tx.watchProgress.upsert({
        where: {
          userId_episodeId: {
            userId: input.userId,
            episodeId: input.episodeId,
          },
        },
        create: { ...input, positionSec },
        update: {
          positionSec,
          completed: input.completed,
        },
      })

      // 평균 시청률 화면이 기본값 0에 머물지 않도록, 해당 영상의
      // 사용자별 최신 진행 위치 평균을 에피소드 통계에 반영한다.
      const aggregate = await tx.watchProgress.aggregate({
        where: {
          episodeId: input.episodeId,
          user: { deletedAt: null, status: 'ACTIVE' },
        },
        _avg: { positionSec: true },
      })
      await tx.episode.update({
        where: { id: input.episodeId },
        data: { avgWatchSec: Math.round(aggregate._avg.positionSec ?? 0) },
      })
    })
  })
}
