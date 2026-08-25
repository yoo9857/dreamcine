import {
  NotImplementedError,
  type MarkNotificationsReadInput,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function markNotificationsRead(
  _session: RouteSession,
  _input: MarkNotificationsReadInput,
): Promise<{ readonly updated: number }> {
  throw new NotImplementedError('T10:markNotificationsRead')
}
