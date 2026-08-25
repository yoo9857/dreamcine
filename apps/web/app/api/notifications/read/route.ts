import { MarkNotificationsReadSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { ok } from '@/src/http/response'
import { markNotificationsRead } from '@/src/services/notification/mark-notifications-read'

export const POST = withRoute(
  async ({ body, session }) =>
    ok(
      await markNotificationsRead(
        session,
        parseBody(MarkNotificationsReadSchema, body),
      ),
    ),
  {
    auth: 'required',
    rateLimit: {
      bucket: 'notifications-read',
      limit: 300,
      windowSec: 60,
      by: 'user',
    },
  },
)
