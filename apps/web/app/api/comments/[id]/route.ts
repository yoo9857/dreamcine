import { UpdateCommentSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { noContent, ok } from '@/src/http/response'
import { deleteComment } from '@/src/services/social/delete-comment'
import { updateComment } from '@/src/services/social/update-comment'

const options = {
  auth: 'required',
  rateLimit: {
    bucket: 'comment-mutation',
    limit: 300,
    windowSec: 60,
    by: 'user',
  },
} as const

export const PATCH = withRoute(
  async ({ params, body, session }) =>
    ok(
      await updateComment(
        session,
        params.id ?? '',
        parseBody(UpdateCommentSchema, body),
      ),
    ),
  options,
)

export const DELETE = withRoute(async ({ params, session }) => {
  await deleteComment(session, params.id ?? '')
  return noContent()
}, options)
