import { withRoute } from '@/src/http/handler'
import { ok } from '@/src/http/response'
import { getUnreadMessageCount } from '@/src/services/message/conversation-queries'

/** 메뉴 배지. 화면마다 `DM_UNREAD_POLL_SEC` 주기로 묻는다. */
export const GET = withRoute(
  async ({ session }) => ok(await getUnreadMessageCount(session)),
  {
    auth: 'required',
    rateLimit: {
      bucket: 'dm-unread',
      limit: 120,
      windowSec: 60,
      by: 'user',
    },
  },
)
