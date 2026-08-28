import type { AgeRating, Episode, EpisodeStatus, Page } from '@aidream/core'
import { AppError, type AssetStatus, type TransitionPatch } from '@aidream/core'
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

export interface EpisodePlacement {
  readonly seasonNumber?: number
  readonly number?: number
}

export interface ListEpisodesOptions {
  seriesId: string
  status?: EpisodeStatus[]
  includeDeleted?: false
  limit: number
  cursor?: string
}

export interface CreateEpisodeWithTagsData {
  readonly seriesId: string
  readonly seasonNumber: number
  readonly number: number
  readonly title: string
  readonly description?: string | null
  readonly assetId: string
  readonly ageRating: AgeRating
  readonly aiDisclosure: string
  readonly tags: readonly string[]
}

export interface EpisodeTransitionRecord {
  readonly episode: Episode
  readonly ownerId: string
  readonly assetStatus: AssetStatus | null
}

export function countEpisodesBySeries(seriesId: string): Promise<number> {
  return executeDb(() =>
    db.episode.count({ where: { seriesId, deletedAt: null } }),
  )
}

export function createEpisodeWithTags(
  input: CreateEpisodeWithTagsData,
): Promise<Episode> {
  return withTransaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtextextended(${input.seriesId}, 0))
    `)
    const duplicate = await tx.episode.findFirst({
      where: {
        seriesId: input.seriesId,
        season: { number: input.seasonNumber },
        number: input.number,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (duplicate !== null) {
      throw new AppError('E_EPISODE_NUMBER_DUPLICATE', {
        fields: ['seasonNumber', 'number'],
      })
    }
    const reusedAsset = await tx.episode.findFirst({
      where: { assetId: input.assetId },
      select: { id: true },
    })
    if (reusedAsset !== null) {
      throw new AppError('E_DB_CONFLICT', {
        fields: ['assetId'],
        reason: 'asset-already-linked',
      })
    }
    const season = await tx.season.upsert({
      where: {
        seriesId_number: {
          seriesId: input.seriesId,
          number: input.seasonNumber,
        },
      },
      create: { seriesId: input.seriesId, number: input.seasonNumber },
      update: {},
    })
    const row = await tx.episode.create({
      data: {
        seriesId: input.seriesId,
        seasonId: season.id,
        assetId: input.assetId,
        number: input.number,
        title: input.title,
        description: input.description ?? null,
        ageRating: input.ageRating,
        aiDisclosure: input.aiDisclosure,
      },
    })
    for (const name of input.tags) {
      const tag = await tx.tag.upsert({
        where: { name },
        create: { name, useCount: 1 },
        update: { useCount: { increment: 1 } },
      })
      await tx.episodeTag.create({
        data: { episodeId: row.id, tagId: tag.id },
      })
    }
    return mapEpisode(row)
  })
}

export function findEpisodeForTransition(
  id: string,
): Promise<EpisodeTransitionRecord | null> {
  return executeDb(async () => {
    const row = await db.episode.findFirst({
      where: { id, deletedAt: null, series: { deletedAt: null } },
      include: {
        series: { select: { ownerId: true } },
        asset: { select: { status: true } },
      },
    })
    if (row === null) return null
    return {
      episode: mapEpisode(row),
      ownerId: row.series.ownerId,
      assetStatus: row.asset?.status ?? null,
    }
  })
}

export function transitionEpisode(
  id: string,
  next: EpisodeStatus,
  patch: TransitionPatch,
): Promise<Episode> {
  return withTransaction(async (tx) => {
    const current = await tx.episode.findFirst({
      where: { id, deletedAt: null },
      select: { seriesId: true },
    })
    if (current === null) throw new AppError('E_EPISODE_NOT_FOUND')
    const row = await tx.episode.update({
      where: { id, deletedAt: null },
      data: { status: next, ...patch },
    })
    const episodeCount = await tx.episode.count({
      where: {
        seriesId: current.seriesId,
        status: 'PUBLISHED',
        deletedAt: null,
      },
    })
    await tx.series.update({
      where: { id: current.seriesId, deletedAt: null },
      data: { episodeCount },
    })
    return mapEpisode(row)
  })
}

export function listScheduledEpisodesDue(
  now: Date,
  limit: number,
): Promise<readonly EpisodeTransitionRecord[]> {
  return executeDb(async () => {
    const rows = await db.episode.findMany({
      where: {
        status: 'SCHEDULED',
        publishAt: { lte: now },
        deletedAt: null,
        series: { deletedAt: null },
      },
      include: {
        series: { select: { ownerId: true } },
        asset: { select: { status: true } },
      },
      orderBy: [{ publishAt: 'asc' }, { id: 'asc' }],
      take: limit,
    })
    return rows.map((row) => ({
      episode: mapEpisode(row),
      ownerId: row.series.ownerId,
      assetStatus: row.asset?.status ?? null,
    }))
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

export function updateEpisodeWithTags(
  id: string,
  input: UpdateEpisodeData,
  tags?: readonly string[],
  placement?: EpisodePlacement,
): Promise<Episode> {
  return withTransaction(async (tx) => {
    const current = await tx.episode.findFirst({
      where: { id, deletedAt: null },
      include: {
        season: { select: { number: true } },
        tags: { select: { tagId: true } },
      },
    })
    if (current === null) throw new AppError('E_EPISODE_NOT_FOUND')

    let placementData: { seasonId: string; number: number } | undefined
    if (placement !== undefined) {
      await tx.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${current.seriesId}, 0))
      `)
      const seasonNumber = placement.seasonNumber ?? current.season?.number ?? 1
      const number = placement.number ?? current.number
      const duplicate = await tx.episode.findFirst({
        where: {
          id: { not: id },
          seriesId: current.seriesId,
          season: { number: seasonNumber },
          number,
          deletedAt: null,
        },
        select: { id: true },
      })
      if (duplicate !== null) {
        throw new AppError('E_EPISODE_NUMBER_DUPLICATE', {
          fields: ['seasonNumber', 'number'],
        })
      }
      const season = await tx.season.upsert({
        where: {
          seriesId_number: { seriesId: current.seriesId, number: seasonNumber },
        },
        create: { seriesId: current.seriesId, number: seasonNumber },
        update: {},
      })
      placementData = { seasonId: season.id, number }
    }
    const row = await tx.episode.update({
      where: { id, deletedAt: null },
      data: { ...input, ...placementData },
    })
    if (tags !== undefined) {
      for (const relation of current.tags) {
        await tx.tag.update({
          where: { id: relation.tagId },
          data: { useCount: { decrement: 1 } },
        })
      }
      await tx.episodeTag.deleteMany({ where: { episodeId: id } })
      for (const name of tags) {
        const tag = await tx.tag.upsert({
          where: { name },
          create: { name, useCount: 1 },
          update: { useCount: { increment: 1 } },
        })
        await tx.episodeTag.create({
          data: { episodeId: id, tagId: tag.id },
        })
      }
    }
    return mapEpisode(row)
  })
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
