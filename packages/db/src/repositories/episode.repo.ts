import type { AgeRating, Episode, EpisodeStatus, Page } from '@aidream/core'
import { AppError } from '@aidream/core'
import { Prisma } from '@prisma/client'
import { db } from '../client.js'
import { decodeCursor, encodeCursor } from '../cursor.js'
import { executeDb } from '../errors.js'
import { mapEpisode } from '../mappers/episode.mapper.js'
import { withTransaction } from '../tx.js'

export interface CreateEpisodeData {
  seriesId: string
  seasonId?: string | null
  number: number
  title: string
  description?: string | null
  ageRating?: AgeRating
  aiDisclosure?: string | null
}

export interface UpdateEpisodeData {
  title?: string
  description?: string | null
  thumbKey?: string | null
  ageRating?: AgeRating
  aiDisclosure?: string | null
  assetId?: string | null
}

export interface ListEpisodesOptions {
  seriesId: string
  status?: EpisodeStatus[]
  includeDeleted?: false
  limit: number
  cursor?: string
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

export function findEpisodeById(id: string): Promise<Episode | null> {
  return executeDb(async () => {
    const row = await db.episode.findFirst({ where: { id, deletedAt: null } })
    return row === null ? null : mapEpisode(row)
  })
}

export function listEpisodesBySeries(
  options: ListEpisodesOptions,
): Promise<Page<Episode>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : dateCursor(options.cursor)
    const rows = await db.episode.findMany({
      where: {
        seriesId: options.seriesId,
        deletedAt: null,
        ...(options.status === undefined
          ? {}
          : { status: { in: options.status } }),
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
      items: pageRows.map(mapEpisode),
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({ k: last.createdAt.toISOString(), id: last.id })
          : null,
    }
  })
}

export function createEpisode(input: CreateEpisodeData): Promise<Episode> {
  return withTransaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtextextended(${input.seriesId}, 0))
    `)
    const duplicate = await tx.episode.findFirst({
      where: {
        seriesId: input.seriesId,
        seasonId: input.seasonId ?? null,
        number: input.number,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (duplicate !== null) {
      throw new AppError('E_DB_CONFLICT', {
        fields: ['seriesId', 'seasonId', 'number'],
      })
    }
    const row = await tx.episode.create({ data: input })
    await tx.series.update({
      where: { id: input.seriesId, deletedAt: null },
      data: { episodeCount: { increment: 1 } },
    })
    return mapEpisode(row)
  })
}

export function updateEpisode(
  id: string,
  input: UpdateEpisodeData,
): Promise<Episode> {
  return executeDb(async () =>
    mapEpisode(
      await db.episode.update({
        where: { id, deletedAt: null },
        data: input,
      }),
    ),
  )
}

export function updateEpisodeStatus(
  id: string,
  next: EpisodeStatus,
  patch: { publishAt?: Date | null; publishedAt?: Date | null },
): Promise<Episode> {
  return executeDb(async () =>
    mapEpisode(
      await db.episode.update({
        where: { id, deletedAt: null },
        data: { status: next, ...patch },
      }),
    ),
  )
}

export function softDeleteEpisode(id: string): Promise<Episode> {
  return withTransaction(async (tx) => {
    const row = await tx.episode.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    await tx.series.update({
      where: { id: row.seriesId, deletedAt: null },
      data: { episodeCount: { decrement: 1 } },
    })
    return mapEpisode(row)
  })
}
