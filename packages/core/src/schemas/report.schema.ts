import { z } from 'zod'

import { ReportReason, ReportStatus, ReportTarget } from '../enums.js'
import { PaginationSchema } from './pagination.schema.js'

export const CreateReportSchema = z.object({
  target: z.enum(ReportTarget),
  targetId: z.string().min(1),
  reason: z.enum(ReportReason),
  detail: z.string().trim().max(1000).optional(),
})

const SuspensionDaysSchema = z
  .union([z.literal(1), z.literal(3), z.literal(7), z.literal(15)])
  .nullable()

export const ReviewReportSchema = z
  .object({
    action: z.enum([
      'WARN_USER',
      'HIDE_CONTENT',
      'REMOVE_CONTENT',
      'SUSPEND_USER',
      'REJECT',
    ]),
    note: z.string().trim().max(1000).optional(),
    durationDays: SuspensionDaysSchema.optional(),
  })
  .superRefine((input, ctx) => {
    if (input.action !== 'REJECT' && !input.note?.trim())
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['note'],
        message: '조치 사유를 입력해 주세요.',
      })
    if (input.action === 'SUSPEND_USER' && input.durationDays === undefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationDays'],
        message: '정지 기간을 선택해 주세요.',
      })
    if (input.action !== 'SUSPEND_USER' && input.durationDays !== undefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationDays'],
        message: '정지 조치에서만 기간을 지정합니다.',
      })
  })

export const ReportQueueQuerySchema = PaginationSchema.extend({
  status: z.enum(ReportStatus).optional(),
})

export const AdminUserQuerySchema = PaginationSchema.extend({
  query: z.string().trim().max(100).optional(),
})

export const UpdateUserStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'WARNING']),
    reason: z.string().trim().min(1).max(1000),
    durationDays: SuspensionDaysSchema.optional(),
  })
  .superRefine((input, ctx) => {
    if (input.status === 'SUSPENDED' && input.durationDays === undefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationDays'],
        message: '정지 기간을 선택해 주세요.',
      })
    if (input.status !== 'SUSPENDED' && input.durationDays !== undefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationDays'],
        message: '정지 조치에서만 기간을 지정합니다.',
      })
  })

export type CreateReportInput = z.infer<typeof CreateReportSchema>
export type ReviewReportInput = z.infer<typeof ReviewReportSchema>
export type ReportQueueQuery = z.infer<typeof ReportQueueQuerySchema>
export type AdminUserQuery = z.infer<typeof AdminUserQuerySchema>
export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusSchema>
