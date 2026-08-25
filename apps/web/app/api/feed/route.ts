import { FeedQuerySchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { paginated } from '@/src/http/response'
import { getFeed } from '@/src/services/feed/get-feed'

export const GET = withRoute(
  async ({ query, session }) => {
    const page = await getFeed(
      FeedQuerySchema.parse(Object.fromEntries(query)),
      session,
    )
    return paginated(page.items, page.nextCursor)
  },
  { auth: 'optional' },
)
