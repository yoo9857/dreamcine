import { z } from 'zod'

import { AgeRating } from '../enums.js'
import { PaginationSchema } from './pagination.schema.js'

const CreatorSchema = z.object({
  handle: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
})

export const FeedItemSchema = z.object({
  episodeId: z.string().min(1),
  title: z.string().min(1),
  thumbUrl: z.string().url().nullable(),
  durationSec: z.number().int().nonnegative().nullable(),
  ageRating: z.enum(AgeRating),
  viewCount: z.string().regex(/^\d+$/u),
  likeCount: z.number().int().nonnegative(),
  publishedAt: z.string().datetime(),
  series: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    slug: z.string().min(1),
  }),
  creator: CreatorSchema,
  isLiked: z.boolean(),
})

export const FeedPageSchema = z.object({
  items: z.array(FeedItemSchema),
  nextCursor: z.string().nullable(),
})

export const FeedQuerySchema = PaginationSchema.extend({
  type: z.enum(['popular', 'latest', 'following']).default('popular'),
})

export const SearchQuerySchema = PaginationSchema.extend({
  q: z.string().trim().min(2).max(50),
  type: z.enum(['series', 'episode', 'user']),
})

export const TagFeedQuerySchema = PaginationSchema

export const SearchResultSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('series'),
    id: z.string().min(1),
    title: z.string().min(1),
    slug: z.string().min(1),
    posterUrl: z.string().url().nullable(),
    creator: CreatorSchema,
  }),
  z.object({ type: z.literal('episode'), episode: FeedItemSchema }),
  z.object({
    type: z.literal('user'),
    handle: z.string().min(1),
    displayName: z.string().min(1),
    avatarUrl: z.string().url().nullable(),
    followerCount: z.number().int().nonnegative(),
  }),
])

export const TrendingTagsResponseSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1),
      useCount: z.number().int().nonnegative(),
    }),
  ),
})

export type FeedQuery = z.infer<typeof FeedQuerySchema>
export type SearchQuery = z.infer<typeof SearchQuerySchema>
export type TagFeedQuery = z.infer<typeof TagFeedQuerySchema>
