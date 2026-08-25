import { UpdateEpisodeSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { noContent, ok } from '@/src/http/response'
import { deleteEpisode } from '@/src/services/episode/delete-episode'
import { getEpisode } from '@/src/services/episode/get-episode'
import { updateEpisode } from '@/src/services/episode/update-episode'

export const GET = withRoute(
  async ({ params, session }) => ok(await getEpisode(params.id ?? '', session)),
  { auth: 'optional' },
)

export const PATCH = withRoute(
  async ({ params, session, body }) =>
    ok(
      await updateEpisode(
        params.id ?? '',
        session,
        parseBody(UpdateEpisodeSchema, body),
      ),
    ),
  { auth: 'required' },
)

export const DELETE = withRoute(
  async ({ params, session }) => {
    await deleteEpisode(params.id ?? '', session, new Date())
    return noContent()
  },
  { auth: 'required' },
)
