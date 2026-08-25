import type { Page, SeriesListQuery, SeriesResponse } from '@aidream/core'
import { listPublicSeries } from '@aidream/db'

import { toSeriesResponse } from './create-series'

export async function listSeries(
  query: SeriesListQuery,
): Promise<Page<SeriesResponse>> {
  const page = await listPublicSeries({
    limit: query.limit,
    ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
  })
  return {
    items: page.items.map(toSeriesResponse),
    nextCursor: page.nextCursor,
  }
}
