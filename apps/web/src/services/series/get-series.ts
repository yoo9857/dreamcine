import {
  AppError,
  type EpisodeResponse,
  type SeriesResponse,
} from '@aidream/core'
import { findPublicSeriesDetail, findSeriesAspectRatios } from '@aidream/db'

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
  // 숏폼 판정에 쓰는 실제 영상 비율. 못 구해도 상세는 그대로 내보낸다.
  const ratio = (
    await findSeriesAspectRatios([detail.series.id]).catch(
      () => new Map<string, number>(),
    )
  ).get(detail.series.id)
  const series = toSeriesResponse(detail.series)
  return {
    series: ratio === undefined ? series : { ...series, aspectRatio: ratio },
    episodes: detail.episodes.map(toEpisodeResponse),
  }
}
