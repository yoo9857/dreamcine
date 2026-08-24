import { withRoute } from '@/src/http/handler'
import { ok } from '@/src/http/response'
import { getPlayback } from '@/src/services/episode/get-playback'

export const GET = withRoute(
  async ({ req, session, params }) =>
    ok(
      await getPlayback({
        episodeId: params.id ?? '',
        session,
        cookieHeader: req.headers.get('cookie'),
        now: new Date(),
      }),
    ),
  {
    auth: 'optional',
    csrf: false,
    rateLimit: { bucket: 'playback', limit: 300, windowSec: 60, by: 'ip' },
  },
)
