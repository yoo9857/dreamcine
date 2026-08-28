import { db } from '../client.js'
import { executeDb } from '../errors.js'

export interface StudioDashboardRecord {
  readonly totals: {
    readonly series: number
    readonly episodes: number
    readonly views: string
    readonly followers: number
    readonly likes: number
    readonly comments: number
  }
  readonly episodeStatus: readonly {
    readonly status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'HIDDEN' | 'REMOVED'
    readonly count: number
  }[]
  readonly recentEpisodes: readonly {
    readonly id: string
    readonly seriesId: string
    readonly seriesTitle: string
    readonly title: string
    readonly number: number
    readonly status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'HIDDEN' | 'REMOVED'
    readonly thumbKey: string | null
    readonly viewCount: string
    readonly likeCount: number
    readonly commentCount: number
    readonly updatedAt: Date
  }[]
}

export interface StudioAssetRecord {
  readonly id: string
  readonly fileName: string
  readonly durationSec: number | null
  readonly posterKey: string | null
  readonly readyAt: Date | null
}

export interface StudioMediaRecord extends StudioAssetRecord {
  readonly status: 'PENDING' | 'PROBING' | 'TRANSCODING' | 'READY' | 'FAILED'
  readonly width: number | null
  readonly height: number | null
  readonly attemptCount: number
  readonly errorCode: string | null
  readonly createdAt: Date
  readonly episode: {
    readonly id: string
    readonly seriesId: string
    readonly title: string
  } | null
}

export interface StudioSeriesAnalyticsRecord {
  readonly series: {
    readonly id: string
    readonly title: string
  }
  readonly totals: {
    readonly episodes: number
    readonly views: string
    readonly impressions: string
    readonly likes: number
    readonly comments: number
    readonly shares: number
    readonly watchSeconds: string
    readonly uniqueViewers: number
    readonly completedViewers: number
  }
  readonly episodes: readonly {
    readonly id: string
    readonly title: string
    readonly number: number
    readonly status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'HIDDEN' | 'REMOVED'
    readonly seasonNumber: number | null
    readonly seasonTitle: string | null
    readonly thumbKey: string | null
    readonly durationSec: number | null
    readonly viewCount: string
    readonly impressionCount: string
    readonly likeCount: number
    readonly commentCount: number
    readonly shareCount: number
    readonly avgWatchSec: number
    readonly uniqueViewers: number
    readonly completedViewers: number
    readonly publishedAt: Date | null
    readonly updatedAt: Date
  }[]
}

export function getStudioDashboardRecord(
  ownerId: string,
): Promise<StudioDashboardRecord> {
  return executeDb(async () => {
    const [user, seriesCount, engagement, statuses, recentEpisodes] =
      await Promise.all([
        db.user.findUniqueOrThrow({
          where: { id: ownerId, deletedAt: null },
          select: { followerCount: true },
        }),
        db.series.count({ where: { ownerId, deletedAt: null } }),
        db.episode.aggregate({
          where: {
            deletedAt: null,
            series: { ownerId, deletedAt: null },
          },
          _count: { _all: true },
          _sum: { viewCount: true, likeCount: true, commentCount: true },
        }),
        db.episode.groupBy({
          by: ['status'],
          where: {
            deletedAt: null,
            series: { ownerId, deletedAt: null },
          },
          _count: { _all: true },
        }),
        db.episode.findMany({
          where: {
            deletedAt: null,
            series: { ownerId, deletedAt: null },
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: 6,
          select: {
            id: true,
            seriesId: true,
            title: true,
            number: true,
            status: true,
            thumbKey: true,
            viewCount: true,
            likeCount: true,
            commentCount: true,
            updatedAt: true,
            series: { select: { title: true } },
          },
        }),
      ])

    return {
      totals: {
        series: seriesCount,
        episodes: engagement._count._all,
        views: (engagement._sum.viewCount ?? 0n).toString(),
        followers: user.followerCount,
        likes: engagement._sum.likeCount ?? 0,
        comments: engagement._sum.commentCount ?? 0,
      },
      episodeStatus: statuses.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      recentEpisodes: recentEpisodes.map((episode) => ({
        id: episode.id,
        seriesId: episode.seriesId,
        seriesTitle: episode.series.title,
        title: episode.title,
        number: episode.number,
        status: episode.status,
        thumbKey: episode.thumbKey,
        viewCount: episode.viewCount.toString(),
        likeCount: episode.likeCount,
        commentCount: episode.commentCount,
        updatedAt: episode.updatedAt,
      })),
    }
  })
}

export function listAvailableStudioAssets(
  ownerId: string,
  limit = 100,
): Promise<readonly StudioAssetRecord[]> {
  return executeDb(async () => {
    const rows = await db.videoAsset.findMany({
      where: {
        status: 'READY',
        episode: null,
        upload: { userId: ownerId },
      },
      orderBy: [{ readyAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: {
        id: true,
        durationSec: true,
        posterKey: true,
        readyAt: true,
        upload: { select: { fileName: true } },
      },
    })
    return rows.flatMap((row) =>
      row.upload === null
        ? []
        : [
            {
              id: row.id,
              fileName: row.upload.fileName,
              durationSec: row.durationSec,
              posterKey: row.posterKey,
              readyAt: row.readyAt,
            },
          ],
    )
  })
}

export function listStudioMediaRecords(
  ownerId: string,
  limit = 100,
): Promise<readonly StudioMediaRecord[]> {
  return executeDb(async () => {
    const rows = await db.videoAsset.findMany({
      where: { upload: { userId: ownerId } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: {
        id: true,
        status: true,
        durationSec: true,
        posterKey: true,
        width: true,
        height: true,
        attemptCount: true,
        errorCode: true,
        readyAt: true,
        createdAt: true,
        upload: { select: { fileName: true } },
        episode: {
          select: { id: true, seriesId: true, title: true },
        },
      },
    })
    return rows.flatMap((row) =>
      row.upload === null
        ? []
        : [
            {
              id: row.id,
              fileName: row.upload.fileName,
              status: row.status,
              durationSec: row.durationSec,
              posterKey: row.posterKey,
              width: row.width,
              height: row.height,
              attemptCount: row.attemptCount,
              errorCode: row.errorCode,
              readyAt: row.readyAt,
              createdAt: row.createdAt,
              episode: row.episode,
            },
          ],
    )
  })
}

export function getStudioSeriesAnalyticsRecord(
  ownerId: string,
  seriesId: string,
): Promise<StudioSeriesAnalyticsRecord | null> {
  return executeDb(async () => {
    const series = await db.series.findFirst({
      where: { id: seriesId, ownerId, deletedAt: null },
      select: { id: true, title: true },
    })
    if (series === null) return null

    const [episodes, viewers, completions, seriesViewers, seriesCompletions] =
      await Promise.all([
        db.episode.findMany({
          where: { seriesId, deletedAt: null },
          orderBy: [
            { season: { number: 'asc' } },
            { number: 'asc' },
            { id: 'asc' },
          ],
          select: {
            id: true,
            title: true,
            number: true,
            status: true,
            thumbKey: true,
            durationSec: true,
            viewCount: true,
            impressionCount: true,
            likeCount: true,
            commentCount: true,
            shareCount: true,
            avgWatchSec: true,
            publishedAt: true,
            updatedAt: true,
            season: { select: { number: true, title: true } },
            asset: { select: { durationSec: true, posterKey: true } },
          },
        }),
        db.watchProgress.groupBy({
          by: ['episodeId'],
          where: {
            episode: { seriesId, deletedAt: null },
            user: { deletedAt: null, status: 'ACTIVE' },
          },
          _count: { _all: true },
        }),
        db.watchProgress.groupBy({
          by: ['episodeId'],
          where: {
            completed: true,
            episode: { seriesId, deletedAt: null },
            user: { deletedAt: null, status: 'ACTIVE' },
          },
          _count: { _all: true },
        }),
        db.watchProgress.findMany({
          where: {
            episode: { seriesId, deletedAt: null },
            user: { deletedAt: null, status: 'ACTIVE' },
          },
          distinct: ['userId'],
          select: { userId: true },
        }),
        db.watchProgress.findMany({
          where: {
            completed: true,
            episode: { seriesId, deletedAt: null },
            user: { deletedAt: null, status: 'ACTIVE' },
          },
          distinct: ['userId'],
          select: { userId: true },
        }),
      ])

    const viewerCounts = new Map(
      viewers.map((row) => [row.episodeId, row._count._all]),
    )
    const completionCounts = new Map(
      completions.map((row) => [row.episodeId, row._count._all]),
    )
    const mapped = episodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      number: episode.number,
      status: episode.status,
      seasonNumber: episode.season?.number ?? null,
      seasonTitle: episode.season?.title ?? null,
      thumbKey: episode.thumbKey ?? episode.asset?.posterKey ?? null,
      durationSec: episode.durationSec ?? episode.asset?.durationSec ?? null,
      viewCount: episode.viewCount.toString(),
      impressionCount: episode.impressionCount.toString(),
      likeCount: episode.likeCount,
      commentCount: episode.commentCount,
      shareCount: episode.shareCount,
      avgWatchSec: episode.avgWatchSec,
      uniqueViewers: viewerCounts.get(episode.id) ?? 0,
      completedViewers: completionCounts.get(episode.id) ?? 0,
      publishedAt: episode.publishedAt,
      updatedAt: episode.updatedAt,
    }))

    return {
      series,
      totals: {
        episodes: mapped.length,
        views: episodes
          .reduce((sum, episode) => sum + episode.viewCount, 0n)
          .toString(),
        impressions: episodes
          .reduce((sum, episode) => sum + episode.impressionCount, 0n)
          .toString(),
        likes: episodes.reduce((sum, episode) => sum + episode.likeCount, 0),
        comments: episodes.reduce(
          (sum, episode) => sum + episode.commentCount,
          0,
        ),
        shares: episodes.reduce((sum, episode) => sum + episode.shareCount, 0),
        watchSeconds: episodes
          .reduce(
            (sum, episode) =>
              sum + episode.viewCount * BigInt(episode.avgWatchSec),
            0n,
          )
          .toString(),
        uniqueViewers: seriesViewers.length,
        completedViewers: seriesCompletions.length,
      },
      episodes: mapped,
    }
  })
}
