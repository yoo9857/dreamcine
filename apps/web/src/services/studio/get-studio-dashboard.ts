import {
  getStudioDashboardRecord,
  getStudioSeriesAnalyticsRecord,
  listAvailableStudioAssets,
  listStudioMediaRecords,
} from '@aidream/db'
import { cdnUrl } from '@aidream/storage/cdn'

import type { RouteSession } from '@/src/auth/types'

export async function getStudioDashboard(session: RouteSession) {
  const record = await getStudioDashboardRecord(session.userId)
  return {
    ...record,
    recentEpisodes: record.recentEpisodes.map((episode) => ({
      ...episode,
      thumbUrl: episode.thumbKey === null ? null : cdnUrl(episode.thumbKey),
      updatedAt: episode.updatedAt.toISOString(),
    })),
  }
}

export async function getAvailableStudioAssets(session: RouteSession) {
  const assets = await listAvailableStudioAssets(session.userId)
  return assets.map((asset) => ({
    id: asset.id,
    fileName: asset.fileName,
    durationSec: asset.durationSec,
    posterUrl: asset.posterKey === null ? null : cdnUrl(asset.posterKey),
    readyAt: asset.readyAt?.toISOString() ?? null,
  }))
}

export async function getStudioMediaLibrary(session: RouteSession) {
  const assets = await listStudioMediaRecords(session.userId)
  return assets.map((asset) => ({
    ...asset,
    posterUrl: asset.posterKey === null ? null : cdnUrl(asset.posterKey),
    readyAt: asset.readyAt?.toISOString() ?? null,
    createdAt: asset.createdAt.toISOString(),
  }))
}

export async function getStudioSeriesAnalytics(
  session: RouteSession,
  seriesId: string,
) {
  const analytics = await getStudioSeriesAnalyticsRecord(
    session.userId,
    seriesId,
  )
  if (analytics === null) return null
  return {
    ...analytics,
    episodes: analytics.episodes.map((episode) => ({
      ...episode,
      thumbUrl: episode.thumbKey === null ? null : cdnUrl(episode.thumbKey),
      publishedAt: episode.publishedAt?.toISOString() ?? null,
      updatedAt: episode.updatedAt.toISOString(),
    })),
  }
}

export type StudioDashboard = Awaited<ReturnType<typeof getStudioDashboard>>
export type StudioAssetOption = Awaited<
  ReturnType<typeof getAvailableStudioAssets>
>[number]
export type StudioMediaItem = Awaited<
  ReturnType<typeof getStudioMediaLibrary>
>[number]
export type StudioSeriesAnalytics = NonNullable<
  Awaited<ReturnType<typeof getStudioSeriesAnalytics>>
>
export type StudioEpisodeAnalytics = StudioSeriesAnalytics['episodes'][number]
