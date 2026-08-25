import {
  AppError,
  can,
  type EpisodeResponse,
  type SeriesResponse,
} from '@aidream/core'
import {
  findSeriesById,
  listEpisodesBySeries,
  listSeriesByOwner,
} from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'

import { toEpisodeResponse } from '../episode/create-episode'
import { toSeriesResponse } from './create-series'

export interface StudioSeriesDetail {
  readonly series: SeriesResponse
  readonly episodes: readonly EpisodeResponse[]
}

function assertStudioAccess(session: RouteSession, ownerId?: string): void {
  const actor = {
    id: session.userId,
    role: session.user.role,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
  }
  if (!can(actor, 'series.update', { ownerId: ownerId ?? session.userId })) {
    throw new AppError('E_PERM_NOT_OWNER')
  }
}

export async function listStudioSeries(
  session: RouteSession,
): Promise<readonly SeriesResponse[]> {
  assertStudioAccess(session)
  const page = await listSeriesByOwner({ ownerId: session.userId, limit: 200 })
  return page.items.map(toSeriesResponse)
}

export async function getStudioSeries(
  session: RouteSession,
  seriesId: string,
): Promise<StudioSeriesDetail> {
  const series = await findSeriesById(seriesId)
  if (series === null) throw new AppError('E_SERIES_NOT_FOUND')
  assertStudioAccess(session, series.ownerId)
  const page = await listEpisodesBySeries({ seriesId, limit: 500 })
  return {
    series: toSeriesResponse(series),
    episodes: page.items.map(toEpisodeResponse),
  }
}
