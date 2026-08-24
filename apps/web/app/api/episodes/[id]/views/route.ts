import { withRoute } from '@/src/http/handler'
import { noContent } from '@/src/http/response'
import { countView } from '@/src/services/episode/count-view'

export const POST = withRoute(
  async ({ ip, session, params }) => {
    await countView({
      episodeId: params.id ?? '',
      session,
      ip,
      now: new Date(),
    })
    return noContent()
  },
  {
    auth: 'optional',
    rateLimit: { bucket: 'views', limit: 10, windowSec: 60, by: 'user' },
  },
)
