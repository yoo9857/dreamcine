import {
  ConversationListQuerySchema,
  LIMITS,
  StartConversationSchema,
} from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { created, paginated } from '@/src/http/response'
import { listMyConversations } from '@/src/services/message/conversation-queries'
import { startConversation } from '@/src/services/message/send-message'

export const GET = withRoute(
  async ({ query, session }) => {
    const page = await listMyConversations(
      session,
      ConversationListQuerySchema.parse(Object.fromEntries(query)),
    )
    return paginated(page.items, page.nextCursor)
  },
  {
    auth: 'required',
    rateLimit: {
      bucket: 'dm-conversations-list',
      limit: 300,
      windowSec: 60,
      by: 'user',
    },
  },
)

/** 새 대화. 하루 한도는 낯선 작가 여럿에게 뿌리는 스팸을 막는다 (05 §10). */
export const POST = withRoute(
  async ({ body, session }) =>
    created(
      await startConversation(
        session,
        parseBody(StartConversationSchema, body),
      ),
    ),
  {
    auth: 'required',
    rateLimit: {
      bucket: 'dm-start',
      limit: LIMITS.DM_NEW_CONVERSATIONS_DAILY,
      windowSec: 86_400,
      by: 'user',
    },
  },
)
