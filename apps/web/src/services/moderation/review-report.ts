import {
  AppError,
  can,
  ReviewReportSchema,
  type Report,
  type ReviewReportInput,
} from '@aidream/core'
import { applyReportDecision, markModerationMediaQueued } from '@aidream/db'
import { QUEUE } from '@aidream/queue'
import type { RouteSession } from '@/src/auth/types'
import { enqueue } from '@/src/lib/enqueue'
import { getLogger } from '@/src/lib/logger'

export interface ReviewReportDependencies {
  applyDecision: typeof applyReportDecision
  markQueued: typeof markModerationMediaQueued
  enqueueDelete: (assetId: string) => Promise<void>
}
export async function reviewReport(
  session: RouteSession,
  reportId: string,
  input: ReviewReportInput,
  dependencies: ReviewReportDependencies = {
    applyDecision: applyReportDecision,
    markQueued: markModerationMediaQueued,
    enqueueDelete: (assetId) =>
      enqueue(
        QUEUE.EPISODE_MEDIA_DELETE,
        { assetId },
        { jobId: 'episode-media-delete-' + assetId, attempts: 3 },
      ),
  },
): Promise<Report> {
  if (!can({ ...session.user, id: session.userId }, 'report.review'))
    throw new AppError('E_PERM_DENIED')
  if (
    (input.action === 'SUSPEND_USER' || input.action === 'REMOVE_CONTENT') &&
    !can({ ...session.user, id: session.userId }, 'user.suspend')
  )
    throw new AppError('E_PERM_DENIED')
  const parsed = ReviewReportSchema.safeParse(input)
  if (!parsed.success) throw new AppError('E_VALIDATION')
  const result = await dependencies.applyDecision({
    actorId: session.userId,
    reportId,
    decision: parsed.data,
  })
  // Cleanup remains in the database outbox until queue delivery succeeds.
  if (result.assetIds.length > 0) {
    try {
      for (const assetId of result.assetIds)
        await dependencies.enqueueDelete(assetId)
      await dependencies.markQueued(result.actionId)
    } catch (error: unknown) {
      getLogger().error(
        { err: error, actionId: result.actionId },
        'moderation media cleanup deferred',
      )
    }
  }
  return result.report
}
