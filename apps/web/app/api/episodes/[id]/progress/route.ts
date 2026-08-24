import { SaveProgressSchema } from '@aidream/core'
import { withRoute } from '@/src/http/handler'
import { noContent } from '@/src/http/response'
import { saveProgress } from '@/src/services/episode/save-progress'

export const POST = withRoute(
  async ({ body, session, params }) => {
    await saveProgress({
      episodeId: params.id ?? '',
      progress: SaveProgressSchema.parse(body),
      session,
      now: new Date(),
    })
    return noContent()
  },
  {
    auth: 'required',
    rateLimit: { bucket: 'progress', limit: 10, windowSec: 60, by: 'user' },
  },
)
