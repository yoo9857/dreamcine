import {
  AppError,
  can,
  type Report,
  type ReviewReportInput,
} from '@aidream/core'
import {
  claimReportForReview,
  findReportTargetContext,
  removeModerationTarget,
  resolveReportGroup,
  setModerationTargetHidden,
} from '@aidream/db'
import { QUEUE } from '@aidream/queue'

import type { RouteSession } from '@/src/auth/types'
import { enqueue } from '@/src/lib/enqueue'
import { getLogger } from '@/src/lib/logger'
import { notify } from '@/src/services/notification/notify'

import { suspendUser } from './suspend-user'

export interface ReviewReportDependencies {
  claim: typeof claimReportForReview
  findTarget: typeof findReportTargetContext
  setHidden: typeof setModerationTargetHidden
  remove: typeof removeModerationTarget
  resolve: typeof resolveReportGroup
  suspend: typeof suspendUser
  notify: typeof notify
  enqueueDelete: (assetId: string) => Promise<void>
}

export function reviewReport(
  session: RouteSession,
  reportId: string,
  input: ReviewReportInput,
  dependencies: ReviewReportDependencies = productionDependencies(),
): Promise<Report> {
  return runReviewReport(session, reportId, input, dependencies)
}

async function runReviewReport(
  session: RouteSession,
  reportId: string,
  input: ReviewReportInput,
  dependencies: ReviewReportDependencies,
): Promise<Report> {
  const actor = {
    id: session.userId,
    role: session.user.role,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
  }
  if (!can(actor, 'report.review')) throw new AppError('E_PERM_DENIED')
  if (
    (input.action === 'REMOVE_CONTENT' || input.action === 'SUSPEND_USER') &&
    !can(actor, 'user.suspend')
  ) {
    throw new AppError('E_PERM_DENIED')
  }

  const report = await dependencies.claim(reportId)
  const target = await dependencies.findTarget(report.target, report.targetId)
  if (target === null) throw new AppError('E_NOT_FOUND')

  switch (input.action) {
    case 'HIDE_CONTENT':
      await dependencies.setHidden(report.target, report.targetId, true)
      break
    case 'REMOVE_CONTENT': {
      const assetIds = await dependencies.remove(
        report.target,
        report.targetId,
        new Date(),
      )
      await Promise.all(
        assetIds.map((assetId) => dependencies.enqueueDelete(assetId)),
      )
      break
    }
    case 'SUSPEND_USER':
      await dependencies.suspend(
        session,
        target.ownerId,
        'SUSPENDED',
        input.note ?? '신고 심사 조치',
      )
      break
    case 'REJECT':
      if (report.autoHidden)
        await dependencies.setHidden(report.target, report.targetId, false)
      break
  }

  const result = await dependencies.resolve({
    reportId,
    status: input.action === 'REJECT' ? 'REJECTED' : 'ACTIONED',
    handledBy: session.userId,
    handledAt: new Date(),
    ...(input.note === undefined ? {} : { actionNote: input.note }),
  })

  try {
    await dependencies.notify({
      type: 'MODERATION',
      to: target.ownerId,
      targetType: report.target,
      targetId: report.targetId,
      action: input.action,
    })
  } catch (error: unknown) {
    getLogger().error(
      {
        err: error,
        moderatorId: session.userId,
        reportId,
        action: input.action,
      },
      'moderation notification failed',
    )
  }
  getLogger().info(
    {
      moderatorId: session.userId,
      action: input.action,
      target: report.target,
      targetId: report.targetId,
      reportIds: [reportId],
    },
    'moderation report reviewed',
  )
  return result
}

function productionDependencies(): ReviewReportDependencies {
  return {
    claim: claimReportForReview,
    findTarget: findReportTargetContext,
    setHidden: setModerationTargetHidden,
    remove: removeModerationTarget,
    resolve: resolveReportGroup,
    suspend: suspendUser,
    notify,
    enqueueDelete: (assetId) =>
      enqueue(
        QUEUE.EPISODE_MEDIA_DELETE,
        { assetId },
        { jobId: `episode-media-delete-${assetId}`, attempts: 3 },
      ),
  }
}
