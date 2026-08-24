import { z } from 'zod'

import { AgeRating } from '../enums.js'
import { LIMITS } from '../limits.js'

export const CreateSeriesSchema = z.object({
  title: z.string().trim().min(1).max(120),
  synopsis: z.string().trim().max(2000).optional(),
  posterKey: z.string().min(1).optional(),
  ageRating: z.enum(AgeRating).optional(),
})

export const UpdateSeriesSchema = CreateSeriesSchema.extend({
  isCompleted: z.boolean().optional(),
  commentsOff: z.boolean().optional(),
}).partial()

export const SeriesListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(LIMITS.FEED_PAGE_MAX).default(20),
  cursor: z.string().min(1).optional(),
})

export const SeriesResponseSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  slug: z.string(),
  title: z.string(),
  synopsis: z.string().nullable(),
  posterUrl: z.string().url().optional(),
  ageRating: z.enum(AgeRating),
  isCompleted: z.boolean(),
  commentsOff: z.boolean(),
  episodeCount: z.number().int().min(0),
  totalViews: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type CreateSeriesInput = z.infer<typeof CreateSeriesSchema>
export type UpdateSeriesInput = z.infer<typeof UpdateSeriesSchema>
export type SeriesListQuery = z.infer<typeof SeriesListQuerySchema>
export type SeriesResponse = z.infer<typeof SeriesResponseSchema>
