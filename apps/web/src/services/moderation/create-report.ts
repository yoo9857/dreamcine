import {
  AppError,
  can,
  decideAutoAction,
  type CreateReportInput,
  type Report,
} from '@aidream/core'
import {
  countOpenReports,
  createReport as insertReport,
  findReportByReporterAndTarget,
  findReportTargetContext,
  setModerationTargetHidden,
  setReportAutomaticState,
} from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'
import { getLogger } from '@/src/lib/logger'
import { notify } from '@/src/services/notification/notify'

export interface CreateReportDependencies {
  findTarget: typeof findReportTargetContext
  findDuplicate: typeof findReportByReporterAndTarget
  insert: typeof insertReport
  stats: typeof countOpenReports
  setAutomaticState: typeof setReportAutomaticState
  setHidden: typeof setModerationTargetHidden
  notify: typeof notify
}

export function createReport(
  session: RouteSession,
  input: CreateReportInput,
  dependencies: CreateReportDependencies = productionDependencies(),
): Promise<Report> {
  return runCreateReport(session, input, dependencies)
}

async function runCreateReport(
  session: RouteSession,
  input: CreateReportInput,
  dependencies: CreateReportDependencies,
): Promise<Report> {
  const actor = {
    id: session.userId,
    role: session.user.role,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
  }
  if (!can(actor, 'report.create')) throw new AppError('E_PERM_DENIED')

  const target = await dependencies.findTarget(input.target, input.targetId)
  if (target === null) throw new AppError('E_NOT_FOUND')
  if (target.ownerId === session.userId)
    throw new AppError('E_USER_SELF_ACTION')
  if (
    (await dependencies.findDuplicate({
      reporterId: session.userId,
      target: input.target,
      targetId: input.targetId,
    })) !== null
  ) {
    throw new AppError('E_REPORT_DUPLICATE')
  }

  let report: Report
  try {
    report = await dependencies.insert({
      reporterId: session.userId,
      target: input.target,
      targetId: input.targetId,
      reason: input.reason,
      ...(input.detail === undefined ? {} : { detail: input.detail }),
    })
  } catch (error: unknown) {
    if (error instanceof AppError && error.code === 'E_DB_CONFLICT')
      throw new AppError('E_REPORT_DUPLICATE', undefined, error)
    throw error
  }

  const stats = await dependencies.stats(input.target, input.targetId)
  const action = decideAutoAction({
    ...stats,
    reason: input.reason,
    targetAgeHours: Math.max(
      0,
      (Date.now() - target.createdAt.getTime()) / (60 * 60 * 1000),
    ),
  })
  if (action === 'NONE') return report
  if (action === 'PRIORITIZE') {
    return dependencies.setAutomaticState(report.id, { priorityFlag: true })
  }

  let hiddenApplied = false
  try {
    await dependencies.setHidden(input.target, input.targetId, true)
    hiddenApplied = true
    report = await dependencies.setAutomaticState(report.id, {
      priorityFlag: true,
      autoHidden: true,
    })
  } catch (error: unknown) {
    if (hiddenApplied) {
      try {
        await dependencies.setHidden(input.target, input.targetId, false)
      } catch (rollbackError: unknown) {
        getLogger().error(
          {
            err: rollbackError,
            reportId: report.id,
            target: input.target,
            targetId: input.targetId,
          },
          'automatic moderation hide rollback failed',
        )
      }
    }
    getLogger().error(
      {
        err: error,
        reportId: report.id,
        target: input.target,
        targetId: input.targetId,
      },
      'automatic moderation hide failed',
    )
    return report
  }

  try {
    await dependencies.notify({
      type: 'MODERATION',
      to: target.ownerId,
      targetType: input.target,
      targetId: input.targetId,
      action: 'AUTO_HIDE',
    })
  } catch (error: unknown) {
    getLogger().error(
      {
        err: error,
        reportId: report.id,
        target: input.target,
        targetId: input.targetId,
      },
      'automatic moderation notification failed',
    )
  }
  return report
}

function productionDependencies(): CreateReportDependencies {
  return {
    findTarget: findReportTargetContext,
    findDuplicate: findReportByReporterAndTarget,
    insert: insertReport,
    stats: countOpenReports,
    setAutomaticState: setReportAutomaticState,
    setHidden: setModerationTargetHidden,
    notify,
  }
}
