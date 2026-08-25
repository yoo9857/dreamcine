import {
  type Notification,
  type NotificationListQuery,
  type Page,
} from '@aidream/core'
import { listNotificationsPage } from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'

export function listNotifications(
  session: RouteSession,
  query: NotificationListQuery,
  list: typeof listNotificationsPage = listNotificationsPage,
): Promise<Page<Notification>> {
  return list({
    userId: session.userId,
    limit: query.limit,
    ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
  })
}
