import type { MarkNotificationsReadInput } from '@aidream/core'
import { markNotificationsReadByIds } from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'

export function markNotificationsRead(
  session: RouteSession,
  input: MarkNotificationsReadInput,
  mark: typeof markNotificationsReadByIds = markNotificationsReadByIds,
): Promise<{ readonly updated: number }> {
  return mark(session.userId, input.ids).then((updated) => ({ updated }))
}
