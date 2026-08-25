import { z } from 'zod'

import { LIMITS } from '../limits.js'

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(LIMITS.FEED_PAGE_MAX).default(20),
  cursor: z.string().min(1).optional(),
})

export type PaginationInput = z.infer<typeof PaginationSchema>

export function parsePagination(input: unknown): PaginationInput {
  return PaginationSchema.parse(input)
}
