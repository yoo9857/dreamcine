import type { Episode as PrismaEpisode } from '@prisma/client'
import type { Episode } from '@aidream/core'

export function mapEpisode(row: PrismaEpisode): Episode {
  return {
    id: row.id,
    seriesId: row.seriesId,
    seasonId: row.seasonId,
    assetId: row.assetId,
    number: row.number,
    title: row.title,
    description: row.description,
    thumbKey: row.thumbKey,
    status: row.status,
    ageRating: row.ageRating,
    aiDisclosure: row.aiDisclosure,
    publishAt: row.publishAt,
    publishedAt: row.publishedAt,
    viewCount: row.viewCount.toString(),
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    rankScore: row.rankScore,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  }
}
