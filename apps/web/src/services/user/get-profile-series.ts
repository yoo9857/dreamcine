import { AppError, type SeriesResponse } from '@aidream/core'
import {
  findSeriesAspectRatios,
  findUserByHandle,
  listPublicSeriesByOwner,
} from '@aidream/db'

import { toSeriesResponse } from '../series/create-series'

export async function getProfileSeries(
  handle: string,
): Promise<readonly SeriesResponse[]> {
  const user = await findUserByHandle(handle)
  if (user === null) throw new AppError('E_USER_NOT_FOUND')

  const page = await listPublicSeriesByOwner({ ownerId: user.id, limit: 100 })
  // 숏폼 판정은 형식(workType)과 실제 영상 비율을 함께 본다 — 목록·홈과 같은 규칙.
  const ratios = await findSeriesAspectRatios(page.items.map((item) => item.id))
  return page.items.map((item) => {
    const ratio = ratios.get(item.id)
    return ratio === undefined
      ? toSeriesResponse(item)
      : { ...toSeriesResponse(item), aspectRatio: ratio }
  })
}
