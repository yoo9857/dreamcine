import {
  NotImplementedError,
  type Report,
  type ReviewReportInput,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function reviewReport(
  _session: RouteSession,
  _reportId: string,
  _input: ReviewReportInput,
): Promise<Report> {
  throw new NotImplementedError('T12:reviewReport')
}
