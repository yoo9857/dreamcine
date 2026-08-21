import type {
  Season as PrismaSeason,
  Series as PrismaSeries,
} from '@prisma/client'
import type { Season, Series } from '@aidream/core'

export function mapSeries(row: PrismaSeries): Series {
  return {
    id: row.id,
    ownerId: row.ownerId,
    slug: row.slug,
    title: row.title,
    synopsis: row.synopsis,
    posterKey: row.posterKey,
    ageRating: row.ageRating,
    isCompleted: row.isCompleted,
    commentsOff: row.commentsOff,
    episodeCount: row.episodeCount,
    totalViews: row.totalViews.toString(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  }
}

export function mapSeason(row: PrismaSeason): Season {
  return {
    id: row.id,
    seriesId: row.seriesId,
    number: row.number,
    title: row.title,
    createdAt: row.createdAt,
  }
}
