import {
  NotImplementedError,
  type Page,
  type Report,
  type ReportQueueQuery,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function listReportQueue(
  _session: RouteSession,
  _query: ReportQueueQuery,
): Promise<Page<Report>> {
  throw new NotImplementedError('T12:listReportQueue')
}
