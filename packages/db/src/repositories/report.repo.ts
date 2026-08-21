import type {
  Page,
  Report,
  ReportReason,
  ReportStatus,
  ReportTarget,
} from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

export interface CreateReportData {
  reporterId: string
  target: ReportTarget
  targetId: string
  reason: ReportReason
  detail?: string | null
}

export function findReportById(_id: string): Promise<Report | null> {
  throw new NotImplementedError('T02:findReportById')
}

export function createReport(_input: CreateReportData): Promise<Report> {
  throw new NotImplementedError('T02:createReport')
}

export function listReportsForReview(_options: {
  status?: ReportStatus[]
  limit: number
  cursor?: string
}): Promise<Page<Report>> {
  throw new NotImplementedError('T02:listReportsForReview')
}

export function updateReportStatus(
  _id: string,
  _status: ReportStatus,
  _patch: { handledBy: string; handledAt: Date; actionNote?: string | null },
): Promise<Report> {
  throw new NotImplementedError('T02:updateReportStatus')
}
