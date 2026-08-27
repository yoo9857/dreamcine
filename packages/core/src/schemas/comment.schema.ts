import { z } from 'zod'

import { PublicUserSchema } from './user.schema.js'

import { LIMITS } from '../limits.js'
import { PaginationSchema } from './pagination.schema.js'

export const CommentBodySchema = z
  .string()
  .trim()
  .min(1)
  .max(LIMITS.COMMENT_MAX_LEN)

export const CreateCommentSchema = z.object({
  body: CommentBodySchema,
  parentId: z.string().min(1).optional(),
})

export const UpdateCommentSchema = z.object({ body: CommentBodySchema })

export const CommentListQuerySchema = PaginationSchema

/**
 * 댓글 작성자. 피드 크리에이터와 같은 모양이어야 한다 — 같은 배지를 같은
 * 규칙으로 그리기 때문이다.
 */
export const CommentUserSchema = PublicUserSchema

export const CommentResponseSchema = z.object({
  id: z.string().min(1),
  episodeId: z.string().min(1),
  body: z.string(),
  parentId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deleted: z.boolean(),
  user: CommentUserSchema,
})

export const CommentThreadItemSchema = CommentResponseSchema.extend({
  replies: z.array(CommentResponseSchema).max(3),
})

export const CommentPageSchema = z.object({
  items: z.array(CommentThreadItemSchema),
  nextCursor: z.string().nullable(),
})

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>
export type CommentListQuery = z.infer<typeof CommentListQuerySchema>
export type CommentResponse = z.infer<typeof CommentResponseSchema>
export type CommentThreadItem = z.infer<typeof CommentThreadItemSchema>
