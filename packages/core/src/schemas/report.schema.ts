import { z } from 'zod'

import { ReportReason, ReportStatus, ReportTarget } from '../enums.js'
import { PaginationSchema } from './pagination.schema.js'

export const CreateReportSchema = z.object({
  target: z.enum(ReportTarget),
  targetId: z.string().min(1),
  reason: z.enum(ReportReason),
  detail: z.string().trim().max(1000).optional(),
})

export const ReviewReportSchema = z.object({
  action: z.enum(['HIDE_CONTENT', 'REMOVE_CONTENT', 'SUSPEND_USER', 'REJECT']),
  note: z.string().trim().max(1000).optional(),
})

export const ReportQueueQuerySchema = PaginationSchema.extend({
  status: z.enum(ReportStatus).optional(),
})

export const AdminUserQuerySchema = PaginationSchema.extend({
  query: z.string().trim().max(100).optional(),
})

export const UpdateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  reason: z.string().trim().min(1).max(1000),
})

export type CreateReportInput = z.infer<typeof CreateReportSchema>
export type ReviewReportInput = z.infer<typeof ReviewReportSchema>
export type ReportQueueQuery = z.infer<typeof ReportQueueQuerySchema>
export type AdminUserQuery = z.infer<typeof AdminUserQuerySchema>
export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusSchema>
