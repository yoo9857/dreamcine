import type { AgeRating, Page, Series } from '@aidream/core'
import { AppError } from '@aidream/core'
import { db } from '../client.js'
import { decodeCursor, encodeCursor } from '../cursor.js'
import { executeDb } from '../errors.js'
import { mapSeries } from '../mappers/series.mapper.js'
import { withTransaction } from '../tx.js'

export interface CreateSeriesData {
  ownerId: string
  slug: string
  title: string
  synopsis?: string | null
  posterKey?: string | null
  ageRating?: AgeRating
}

export interface UpdateSeriesData {
  title?: string
  synopsis?: string | null
  posterKey?: string | null
  ageRating?: AgeRating
  isCompleted?: boolean
  commentsOff?: boolean
}

export interface ListSeriesByOwnerOptions {
  ownerId: string
  limit: number
  cursor?: string
  includeDeleted?: false
}

function dateCursor(cursor: string): { createdAt: Date; id: string } {
  const payload = decodeCursor(cursor)
  if (typeof payload.k !== 'string') {
    throw new AppError('E_FEED_INVALID_CURSOR')
  }
  const createdAt = new Date(payload.k)
  if (Number.isNaN(createdAt.getTime())) {
    throw new AppError('E_FEED_INVALID_CURSOR')
  }
  return { createdAt, id: payload.id }
}

export function findSeriesById(id: string): Promise<Series | null> {
  return executeDb(async () => {
    const row = await db.series.findFirst({ where: { id, deletedAt: null } })
    return row === null ? null : mapSeries(row)
  })
}

export function findSeriesBySlug(slug: string): Promise<Series | null> {
  return executeDb(async () => {
    const row = await db.series.findFirst({ where: { slug, deletedAt: null } })
    return row === null ? null : mapSeries(row)
  })
}

export function listSeriesByOwner(
  options: ListSeriesByOwnerOptions,
): Promise<Page<Series>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : dateCursor(options.cursor)
    const rows = await db.series.findMany({
      where: {
        ownerId: options.ownerId,
        deletedAt: null,
        ...(cursor === null
          ? {}
          : {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    })
    const hasNext = rows.length > options.limit
    const pageRows = hasNext ? rows.slice(0, options.limit) : rows
    const last = pageRows.at(-1)
    return {
      items: pageRows.map(mapSeries),
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({ k: last.createdAt.toISOString(), id: last.id })
          : null,
    }
  })
}

export function createSeries(input: CreateSeriesData): Promise<Series> {
  return withTransaction(async (tx) => {
    const row = await tx.series.create({ data: input })
    await tx.user.update({
      where: { id: input.ownerId, deletedAt: null },
      data: { seriesCount: { increment: 1 } },
    })
    return mapSeries(row)
  })
}

export function updateSeries(
  id: string,
  input: UpdateSeriesData,
): Promise<Series> {
  return executeDb(async () =>
    mapSeries(
      await db.series.update({
        where: { id, deletedAt: null },
        data: input,
      }),
    ),
  )
}

export function softDeleteSeries(id: string): Promise<Series> {
  return withTransaction(async (tx) => {
    const row = await tx.series.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    await tx.user.update({
      where: { id: row.ownerId, deletedAt: null },
      data: { seriesCount: { decrement: 1 } },
    })
    return mapSeries(row)
  })
}
