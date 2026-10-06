import {
  LIMITS,
  MessageListQuerySchema,
  SendMessageSchema,
} from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { created, paginated } from '@/src/http/response'
import { listConversationMessages } from '@/src/services/message/conversation-queries'
import { sendMessage } from '@/src/services/message/send-message'

/**
 * 열린 대화는 `DM_THREAD_POLL_SEC` 마다 `after` 로 묻는다. 기본 300/분은 탭
 * 여러 개를 열어 두어도 넉넉하다.
 */
export const GET = withRoute(
  async ({ params, query, session }) => {
    const page = await listConversationMessages(
      session,
      params.id ?? '',
      MessageListQuerySchema.parse(Object.fromEntries(query)),
    )
    return paginated(page.items, page.nextCursor)
  },
  {
    auth: 'required',
    rateLimit: {
      bucket: 'dm-messages-list',
      limit: 300,
      windowSec: 60,
      by: 'user',
    },
  },
)

export const POST = withRoute(
  async ({ params, body, session }) =>
    created(
      await sendMessage(
        session,
        params.id ?? '',
        parseBody(SendMessageSchema, body),
      ),
    ),
  {
    auth: 'required',
    rateLimit: {
      bucket: 'dm-send',
      limit: LIMITS.DM_PER_MIN,
      windowSec: 60,
      by: 'user',
    },
  },
)
