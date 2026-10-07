import type { AgeRating, Episode, Page, Series, WorkType } from '@aidream/core'
import { AppError } from '@aidream/core'
import { db } from '../client.js'
import { decodeCursor, encodeCursor } from '../cursor.js'
import { executeDb } from '../errors.js'
import { mapEpisode } from '../mappers/episode.mapper.js'
import { mapSeries } from '../mappers/series.mapper.js'
import { withTransaction } from '../tx.js'

export interface CreateSeriesData {
  ownerId: string
  slug: string
  title: string
  synopsis?: string | null
  workType?: WorkType
  posterKey?: string | null
  ageRating?: AgeRating
}

export interface UpdateSeriesData {
  title?: string
  synopsis?: string | null
  workType?: WorkType
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

export interface ListPublicSeriesOptions {
  readonly limit: number
  readonly cursor?: string
}

export interface ListPublicSeriesByOwnerOptions {
  readonly ownerId: string
  readonly limit: number
}

export interface SeriesDetailRecord {
  readonly series: Series
  readonly episodes: readonly Episode[]
}

export interface SoftDeleteSeriesResult {
  readonly series: Series
  readonly assetIds: readonly string[]
}

export function countSeriesByOwner(ownerId: string): Promise<number> {
  return executeDb(() =>
    db.series.count({ where: { ownerId, deletedAt: null } }),
  )
}

export function listPublicSeries(
  options: ListPublicSeriesOptions,
): Promise<Page<Series>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : dateCursor(options.cursor)
    const rows = await db.series.findMany({
      where: {
        deletedAt: null,
        episodes: { some: { status: 'PUBLISHED', deletedAt: null } },
        owner: { status: 'ACTIVE', deletedAt: null },
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

export function listPublicSeriesByOwner(
  options: ListPublicSeriesByOwnerOptions,
): Promise<Page<Series>> {
  return executeDb(async () => {
    const rows = await db.series.findMany({
      where: {
        ownerId: options.ownerId,
        deletedAt: null,
        episodes: { some: { status: 'PUBLISHED', deletedAt: null } },
        owner: { status: 'ACTIVE', deletedAt: null },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit,
    })
    return { items: rows.map(mapSeries), nextCursor: null }
  })
}

/**
 * 작품별 첫 공개 회차 원본 영상의 가로/세로 비율. 숏폼 판정(`isShortFormFormat`)에
 * 쓴다. 작품마다 회차를 따로 묻지 않도록 한 번에 가져온다. 비율을 모르면 빠진다.
 */
export function findSeriesAspectRatios(
  seriesIds: readonly string[],
): Promise<ReadonlyMap<string, number>> {
  return executeDb(async () => {
    if (seriesIds.length === 0) return new Map()
    const rows = await db.episode.findMany({
      where: {
        seriesId: { in: [...seriesIds] },
        status: 'PUBLISHED',
        deletedAt: null,
        asset: { width: { gt: 0 }, height: { gt: 0 } },
      },
      select: {
        seriesId: true,
        asset: { select: { width: true, height: true } },
      },
      orderBy: [{ seriesId: 'asc' }, { number: 'asc' }, { id: 'asc' }],
      distinct: ['seriesId'],
    })
    const ratios = new Map<string, number>()
    for (const row of rows) {
      const width = row.asset?.width ?? null
      const height = row.asset?.height ?? null
      if (width !== null && height !== null && width > 0 && height > 0) {
        ratios.set(row.seriesId, width / height)
      }
    }
    return ratios
  })
}

export function findPublicSeriesDetail(
  id: string,
): Promise<SeriesDetailRecord | null> {
  return executeDb(async () => {
    const row = await db.series.findFirst({
      where: {
        id,
        deletedAt: null,
        owner: { status: 'ACTIVE', deletedAt: null },
      },
      include: {
        episodes: {
          where: { status: 'PUBLISHED', deletedAt: null },
          orderBy: [
            { season: { number: 'asc' } },
            { number: 'asc' },
            { id: 'asc' },
          ],
        },
      },
    })
    if (row === null) return null
    return {
      series: mapSeries(row),
      episodes: row.episodes.map(mapEpisode),
    }
  })
}

export function softDeleteSeriesCascade(
  id: string,
): Promise<SoftDeleteSeriesResult> {
  return withTransaction(async (tx) => {
    const current = await tx.series.findFirst({
      where: { id, deletedAt: null },
      include: {
        episodes: {
          where: { deletedAt: null, assetId: { not: null } },
          select: { assetId: true },
        },
      },
    })
    if (current === null) throw new AppError('E_SERIES_NOT_FOUND')
    const deletedAt = new Date()
    await tx.episode.updateMany({
      where: { seriesId: id, deletedAt: null },
      data: { deletedAt },
    })
    const row = await tx.series.update({
      where: { id, deletedAt: null },
      data: { deletedAt },
    })
    await tx.user.update({
      where: { id: row.ownerId, deletedAt: null },
      data: { seriesCount: { decrement: 1 } },
    })
    return {
      series: mapSeries(row),
      assetIds: current.episodes.flatMap(({ assetId }) =>
        assetId === null ? [] : [assetId],
      ),
    }
  })
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
