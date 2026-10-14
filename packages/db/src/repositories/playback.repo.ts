import {
  AppError,
  type AgeRating,
  type AssetStatus,
  type EpisodeStatus,
} from '@aidream/core'
import { Prisma } from '@prisma/client'
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
      where: {
        id: episodeId,
        deletedAt: null,
        series: {
          deletedAt: null,
          owner: { status: 'ACTIVE', deletedAt: null },
        },
      },
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
    })
  })
}

/**
 * 이어보기 한 건마다 그 영상의 시청 기록을 전부 평균 내지 않는다.
 * 분 단위 조회수 반영이 이 함수로, 그 사이 바뀐 회차만 한 번에 고친다.
 */
export function refreshWatchAveragesSince(since: Date): Promise<number> {
  return executeDb(() =>
    db.$executeRaw(Prisma.sql`
      UPDATE episode AS e
      SET avg_watch_sec = src.avg_sec
      FROM (
        SELECT wp.episode_id,
               ROUND(AVG(wp.position_sec))::int AS avg_sec
        FROM watch_progress wp
        INNER JOIN "user" u ON u.id = wp.user_id
        WHERE u.deleted_at IS NULL
          AND u.status = 'ACTIVE'::"UserStatus"
          AND wp.episode_id IN (
            SELECT DISTINCT recent.episode_id
            FROM watch_progress recent
            WHERE recent.updated_at >= ${since}
          )
        GROUP BY wp.episode_id
      ) AS src
      WHERE e.id = src.episode_id
        AND e.deleted_at IS NULL
        AND e.avg_watch_sec IS DISTINCT FROM src.avg_sec
    `),
  )
}
