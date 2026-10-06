import { withRoute } from '@/src/http/handler'
import { noContent } from '@/src/http/response'
import { markConversationRead } from '@/src/services/message/conversation-queries'

export const POST = withRoute(
  async ({ params, session }) => {
    await markConversationRead(session, params.id ?? '')
    return noContent()
  },
  {
    auth: 'required',
    rateLimit: {
      bucket: 'dm-read',
      limit: 300,
      windowSec: 60,
      by: 'user',
    },
  },
)
