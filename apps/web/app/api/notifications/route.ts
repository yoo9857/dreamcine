import { NotificationListQuerySchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { paginated } from '@/src/http/response'
import { listNotifications } from '@/src/services/notification/list-notifications'

export const GET = withRoute(
  async ({ query, session }) => {
    const page = await listNotifications(
      session,
      NotificationListQuerySchema.parse(Object.fromEntries(query)),
    )
    return paginated(page.items, page.nextCursor)
  },
  {
    auth: 'required',
    rateLimit: {
      bucket: 'notifications-list',
      limit: 300,
      windowSec: 60,
      by: 'user',
    },
  },
)
