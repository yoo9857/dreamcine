import { SearchQuerySchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { paginated } from '@/src/http/response'
import { search } from '@/src/services/feed/search'

export const GET = withRoute(
  async ({ query, session }) => {
    const page = await search(
      SearchQuerySchema.parse(Object.fromEntries(query)),
      session,
    )
    return paginated(page.items, page.nextCursor)
  },
  { auth: 'optional' },
)
