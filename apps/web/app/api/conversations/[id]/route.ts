import { withRoute } from '@/src/http/handler'
import { ok } from '@/src/http/response'
import { getConversationDetail } from '@/src/services/message/conversation-queries'

export const GET = withRoute(
  async ({ params, session }) =>
    ok(await getConversationDetail(session, params.id ?? '')),
  {
    auth: 'required',
    rateLimit: {
      bucket: 'dm-conversation-detail',
      limit: 300,
      windowSec: 60,
      by: 'user',
    },
  },
)
