import {
  AppError,
  can,
  type Page,
  type Report,
  type ReportQueueQuery,
} from '@aidream/core'
import {
  getReportTargetPreview,
  listReportsForReview,
  type ReportTargetPreview,
} from '@aidream/db'
import { cdnUrl } from '@aidream/storage/cdn'

import type { RouteSession } from '@/src/auth/types'

export interface ReportQueueItem extends Report {
  preview: Omit<ReportTargetPreview, 'imageKey'> & { imageUrl: string | null }
}

export async function listReportQueue(
  session: RouteSession,
  query: ReportQueueQuery,
  list: typeof listReportsForReview = listReportsForReview,
  preview: typeof getReportTargetPreview = getReportTargetPreview,
): Promise<Page<ReportQueueItem>> {
  if (
    !can(
      {
        id: session.userId,
        role: session.user.role,
        status: session.user.status,
        emailVerified: session.user.emailVerified,
      },
      'report.review',
    )
  ) {
    throw new AppError('E_PERM_DENIED')
  }
  const page = await list({
    limit: query.limit,
    ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
    ...(query.status === undefined ? {} : { status: [query.status] }),
  })
  const items = await Promise.all(
    page.items.map(async (report) => {
      const targetPreview = await preview(report.target, report.targetId)
      if (targetPreview === null) throw new AppError('E_NOT_FOUND')
      const { imageKey, ...details } = targetPreview
      return {
        ...report,
        preview: {
          ...details,
          imageUrl: imageKey === null ? null : cdnUrl(imageKey),
        },
      }
    }),
  )
  return { items, nextCursor: page.nextCursor }
}
