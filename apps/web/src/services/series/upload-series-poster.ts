import { AppError, can } from '@aidream/core'
import { findSeriesById, updateSeries } from '@aidream/db'
import {
  BUCKET,
  IMMUTABLE_1Y,
  cdnUrl,
  deleteObject,
  putObject,
  seriesPosterKey,
} from '@aidream/storage'
import { randomUUID } from 'node:crypto'

import type { RouteSession } from '@/src/auth/types'

const MAX_POSTER_BYTES = 4 * 1024 * 1024

function decodeWebp(dataUrl: string): Buffer {
  const match = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/u.exec(dataUrl)
  if (match?.[1] === undefined) {
    throw new AppError('E_VALIDATION', { field: 'image' })
  }
  const buffer = Buffer.from(match[1], 'base64')
  const webp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  if (!webp || buffer.length === 0 || buffer.length > MAX_POSTER_BYTES) {
    throw new AppError('E_VALIDATION', { field: 'image' })
  }
  return buffer
}

export async function uploadSeriesPoster(
  seriesId: string,
  session: RouteSession,
  dataUrl: string,
): Promise<{ posterUrl: string }> {
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

  const image = decodeWebp(dataUrl)
  const key = seriesPosterKey(series.id, randomUUID())
  await putObject({
    bucket: BUCKET.THUMBS,
    key,
    body: image,
    contentType: 'image/webp',
    cacheControl: IMMUTABLE_1Y,
  })
  try {
    await updateSeries(series.id, { posterKey: key })
  } catch (error: unknown) {
    await deleteObject(BUCKET.THUMBS, key).catch(() => undefined)
    throw error
  }
  if (series.posterKey !== null && series.posterKey !== key) {
    await deleteObject(BUCKET.THUMBS, series.posterKey).catch(() => undefined)
  }
  return { posterUrl: cdnUrl(key) }
}
