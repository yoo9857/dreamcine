import {
  AppError,
  can,
  type SeriesResponse,
  type UpdateSeriesInput,
} from '@aidream/core'
import { findSeriesById, updateSeries as updateSeriesRow } from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'

import { toSeriesResponse } from './create-series'

export async function updateSeries(
  seriesId: string,
  session: RouteSession,
  input: UpdateSeriesInput,
): Promise<SeriesResponse> {
  const series = await findSeriesById(seriesId)
  if (series === null) throw new AppError('E_SERIES_NOT_FOUND')
  const actor = {
    id: session.userId,
    role: session.user.role,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
  }
  if (!can(actor, 'series.update', { ownerId: series.ownerId })) {
    throw new AppError('E_PERM_NOT_OWNER')
  }
  const updated = await updateSeriesRow(series.id, {
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.synopsis === undefined ? {} : { synopsis: input.synopsis }),
    ...(input.workType === undefined ? {} : { workType: input.workType }),
    ...(input.posterKey === undefined ? {} : { posterKey: input.posterKey }),
    ...(input.ageRating === undefined ? {} : { ageRating: input.ageRating }),
    ...(input.isCompleted === undefined
      ? {}
      : { isCompleted: input.isCompleted }),
    ...(input.commentsOff === undefined
      ? {}
      : { commentsOff: input.commentsOff }),
  })
  return toSeriesResponse(updated)
}
