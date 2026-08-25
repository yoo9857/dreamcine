import {
  AppError,
  LIMITS,
  can,
  ensureUniqueSlug,
  toSlug,
  type CreateSeriesInput,
  type Series,
  type SeriesResponse,
} from '@aidream/core'
import {
  countSeriesByOwner,
  createSeries as insertSeries,
  findSeriesBySlug,
} from '@aidream/db'
import { cdnUrl } from '@aidream/storage/cdn'

import type { RouteSession } from '@/src/auth/types'

export function createSeries(
  session: RouteSession,
  input: CreateSeriesInput,
): Promise<SeriesResponse> {
  return runCreateSeries(session, input)
}

async function runCreateSeries(
  session: RouteSession,
  input: CreateSeriesInput,
): Promise<SeriesResponse> {
  const actor = {
    id: session.userId,
    role: session.user.role,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
  }
  if (!can(actor, 'series.create')) {
    throw new AppError('E_PERM_DENIED', { action: 'series.create' })
  }
  const currentCount = await countSeriesByOwner(session.userId)
  if (currentCount >= LIMITS.SERIES_PER_USER) {
    throw new AppError('E_SERIES_LIMIT_EXCEEDED', { currentCount })
  }
  const slug = await ensureUniqueSlug(toSlug(input.title), async (candidate) =>
    Boolean(await findSeriesBySlug(candidate)),
  )
  const series = await insertSeries({
    ownerId: session.userId,
    slug,
    title: input.title,
    synopsis: input.synopsis ?? null,
    posterKey: input.posterKey ?? null,
    ...(input.ageRating === undefined ? {} : { ageRating: input.ageRating }),
  })
  return toSeriesResponse(series)
}

export function toSeriesResponse(series: Series): SeriesResponse {
  return {
    id: series.id,
    ownerId: series.ownerId,
    slug: series.slug,
    title: series.title,
    synopsis: series.synopsis,
    ...(series.posterKey === null
      ? {}
      : { posterUrl: cdnUrl(series.posterKey) }),
    ageRating: series.ageRating,
    isCompleted: series.isCompleted,
    commentsOff: series.commentsOff,
    episodeCount: series.episodeCount,
    totalViews: series.totalViews,
    createdAt: series.createdAt.toISOString(),
    updatedAt: series.updatedAt.toISOString(),
  }
}
