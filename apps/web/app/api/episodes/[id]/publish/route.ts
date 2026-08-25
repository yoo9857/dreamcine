import { PublishEpisodeSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { ok } from '@/src/http/response'
import { publishEpisode } from '@/src/services/episode/publish-episode'

export const POST = withRoute(
  async ({ params, session, body }) =>
    ok(
      await publishEpisode({
        episodeId: params.id ?? '',
        session,
        request: parseBody(PublishEpisodeSchema, body),
        now: new Date(),
      }),
    ),
  { auth: 'required' },
)
