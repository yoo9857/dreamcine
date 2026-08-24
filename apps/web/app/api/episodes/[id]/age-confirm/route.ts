import { AgeConfirmSchema } from '@aidream/core'
import { withRoute } from '@/src/http/handler'
import { confirmAge } from '@/src/services/episode/confirm-age'

export const POST = withRoute(
  async ({ body, session, params }) => {
    const result = await confirmAge({
      episodeId: params.id ?? '',
      confirmation: AgeConfirmSchema.parse(body),
      session,
      now: new Date(),
    })
    return { status: 204, headers: { 'set-cookie': result.setCookie } }
  },
  {
    auth: 'optional',
    rateLimit: { bucket: 'age-confirm', limit: 10, windowSec: 600, by: 'user' },
  },
)
