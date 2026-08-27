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
    bannerKey: row.bannerKey,
    categoryId: row.categoryId,
    language: row.language,
    visibility: row.visibility,
    keywords: row.keywords,
    trailerEpisodeId: row.trailerEpisodeId,
    firstAiredAt: row.firstAiredAt,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    ogImageKey: row.ogImageKey,
    canonicalPath: row.canonicalPath,
    madeForKids: row.madeForKids,
    license: row.license,
    contentWarnings: row.contentWarnings,
    regionsAllowed: row.regionsAllowed,
    regionsBlocked: row.regionsBlocked,
    episodeCount: row.episodeCount,
    totalViews: row.totalViews.toString(),
    totalLikes: row.totalLikes,
    followerCount: row.followerCount,
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
