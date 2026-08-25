import type { Report as PrismaReport } from '@prisma/client'
import type { Report } from '@aidream/core'

export function mapReport(row: PrismaReport): Report {
  return {
    id: row.id,
    reporterId: row.reporterId,
    target: row.target,
    targetId: row.targetId,
    reason: row.reason,
    detail: row.detail,
    status: row.status,
    priorityFlag: row.priorityFlag,
    autoHidden: row.autoHidden,
    handledBy: row.handledBy,
    handledAt: row.handledAt,
    actionNote: row.actionNote,
    createdAt: row.createdAt,
  }
}
