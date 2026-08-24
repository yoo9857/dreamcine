import { z } from 'zod'

import { AgeRating, EpisodeStatus } from '../enums.js'
import { LIMITS } from '../limits.js'

const EpisodeTagsSchema = z
  .array(z.string().trim().min(1).max(24))
  .max(LIMITS.TAGS_PER_EPISODE)

export const CreateEpisodeSchema = z.object({
  seriesId: z.string().min(1),
  seasonNumber: z.number().int().min(1).optional(),
  number: z.number().int().min(1),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  assetId: z.string().min(1),
  ageRating: z.enum(AgeRating),
  aiDisclosure: z.string().trim().min(1).max(500),
  tags: EpisodeTagsSchema.optional(),
})

export const UpdateEpisodeSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  thumbKey: z.string().min(1).nullable().optional(),
  assetId: z.string().min(1).nullable().optional(),
  ageRating: z.enum(AgeRating).optional(),
  aiDisclosure: z.string().trim().min(1).max(500).nullable().optional(),
  tags: EpisodeTagsSchema.optional(),
})

export const PublishEpisodeSchema = z.object({
  action: z.enum(['PUBLISH', 'SCHEDULE', 'HIDE', 'UNHIDE']),
  publishAt: z.string().datetime().optional(),
})

export const EpisodeResponseSchema = z.object({
  id: z.string(),
  seriesId: z.string(),
  seasonId: z.string().nullable(),
  assetId: z.string().nullable(),
  number: z.number().int().min(1),
  title: z.string(),
  description: z.string().nullable(),
  thumbUrl: z.string().url().optional(),
  status: z.enum(EpisodeStatus),
  ageRating: z.enum(AgeRating),
  aiDisclosure: z.string().nullable(),
  publishAt: z.string().datetime().nullable(),
  publishedAt: z.string().datetime().nullable(),
  viewCount: z.string(),
  likeCount: z.number().int().min(0),
  commentCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const PublishEpisodeResponseSchema = EpisodeResponseSchema.pick({
  id: true,
  status: true,
  publishAt: true,
  publishedAt: true,
})

export type CreateEpisodeInput = z.infer<typeof CreateEpisodeSchema>
export type UpdateEpisodeInput = z.infer<typeof UpdateEpisodeSchema>
export type PublishEpisodeInput = z.infer<typeof PublishEpisodeSchema>
export type EpisodeResponse = z.infer<typeof EpisodeResponseSchema>
export type PublishEpisodeResponse = z.infer<
  typeof PublishEpisodeResponseSchema
>
