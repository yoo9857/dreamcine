import { CreateEpisodeSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { created } from '@/src/http/response'
import { createEpisode } from '@/src/services/episode/create-episode'

export const POST = withRoute(
  async ({ session, body }) =>
    created(await createEpisode(session, parseBody(CreateEpisodeSchema, body))),
  { auth: 'required' },
)
