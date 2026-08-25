import { TagFeedQuerySchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { paginated } from '@/src/http/response'
import { getTagFeed } from '@/src/services/feed/search'

export const GET = withRoute(
  async ({ params, query, session }) => {
    const page = await getTagFeed(
      params.tag ?? '',
      TagFeedQuerySchema.parse(Object.fromEntries(query)),
      session,
    )
    return paginated(page.items, page.nextCursor)
  },
  { auth: 'optional' },
)
