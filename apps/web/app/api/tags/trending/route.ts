import { withRoute } from '@/src/http/handler'
import { ok } from '@/src/http/response'
import { getTrendingTags } from '@/src/services/feed/search'

export const GET = withRoute(async () => ok(await getTrendingTags()), {
  auth: 'none',
})
