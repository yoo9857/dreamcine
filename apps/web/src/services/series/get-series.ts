import {
  AppError,
  type EpisodeResponse,
  type SeriesResponse,
} from '@aidream/core'
import { findPublicSeriesDetail } from '@aidream/db'

import { toEpisodeResponse } from '../episode/create-episode'
import { toSeriesResponse } from './create-series'

export interface SeriesDetailResponse {
  readonly series: SeriesResponse
  readonly episodes: readonly EpisodeResponse[]
}

export async function getSeries(
  seriesId: string,
): Promise<SeriesDetailResponse> {
  const detail = await findPublicSeriesDetail(seriesId)
  if (detail === null) throw new AppError('E_SERIES_NOT_FOUND')
  return {
    series: toSeriesResponse(detail.series),
    episodes: detail.episodes.map(toEpisodeResponse),
  }
}
