import {
  NotImplementedError,
  type Notification,
  type NotificationListQuery,
  type Page,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function listNotifications(
  _session: RouteSession,
  _query: NotificationListQuery,
): Promise<Page<Notification>> {
  throw new NotImplementedError('T10:listNotifications')
}
