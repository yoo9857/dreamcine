import {
  NotImplementedError,
  type CreateReportInput,
  type Report,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function createReport(
  _session: RouteSession,
  _input: CreateReportInput,
): Promise<Report> {
  throw new NotImplementedError('T12:createReport')
}
