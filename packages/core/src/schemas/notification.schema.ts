import { z } from 'zod'

import { ERROR_CODES } from '../errors/codes.js'
import { PaginationSchema } from './pagination.schema.js'

export const NotificationPayloadSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('NEW_FOLLOWER'), actorId: z.string().min(1) }),
  z.object({
    type: z.literal('NEW_LIKE'),
    actorId: z.string().min(1),
    episodeId: z.string().min(1),
  }),
  z.object({
    type: z.literal('NEW_COMMENT'),
    actorId: z.string().min(1),
    episodeId: z.string().min(1),
    commentId: z.string().min(1),
  }),
  z.object({
    type: z.literal('NEW_EPISODE'),
    seriesId: z.string().min(1),
    episodeId: z.string().min(1),
  }),
  z.object({
    type: z.literal('TRANSCODE_DONE'),
    assetId: z.string().min(1),
    episodeId: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('TRANSCODE_FAILED'),
    assetId: z.string().min(1),
    errorCode: z.enum(ERROR_CODES),
  }),
  z.object({
    type: z.literal('PUBLISH_FAILED'),
    episodeId: z.string().min(1),
    errorCode: z.enum(ERROR_CODES),
  }),
  z.object({
    type: z.literal('MODERATION'),
    targetType: z.string().min(1),
    targetId: z.string().min(1),
    action: z.string().min(1),
  }),
])

export const NotificationListQuerySchema = PaginationSchema
export const MarkNotificationsReadSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
})

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>
export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>
export type MarkNotificationsReadInput = z.infer<
  typeof MarkNotificationsReadSchema
>
