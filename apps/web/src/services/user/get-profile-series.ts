import { AppError, type SeriesResponse } from '@aidream/core'
import { findUserByHandle, listPublicSeriesByOwner } from '@aidream/db'

import { toSeriesResponse } from '../series/create-series'

export async function getProfileSeries(
  handle: string,
): Promise<readonly SeriesResponse[]> {
  const user = await findUserByHandle(handle)
  if (user === null) throw new AppError('E_USER_NOT_FOUND')

  const page = await listPublicSeriesByOwner({ ownerId: user.id, limit: 100 })
  return page.items.map(toSeriesResponse)
}
