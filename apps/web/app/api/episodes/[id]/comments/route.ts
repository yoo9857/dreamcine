import { CommentListQuerySchema, CreateCommentSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { created, paginated } from '@/src/http/response'
import { createComment } from '@/src/services/social/create-comment'
import { listComments } from '@/src/services/social/list-comments'

export const GET = withRoute(
  async ({ params, query }) => {
    const page = await listComments(
      params.id ?? '',
      CommentListQuerySchema.parse(Object.fromEntries(query)),
    )
    return paginated(page.items, page.nextCursor)
  },
  {
    auth: 'none',
    rateLimit: { bucket: 'comments-list', limit: 100, windowSec: 60, by: 'ip' },
  },
)

export const POST = withRoute(
  async ({ params, body, session }) =>
    created(
      await createComment(
        session,
        params.id ?? '',
        parseBody(CreateCommentSchema, body),
      ),
    ),
  {
    auth: 'required',
    rateLimit: {
      bucket: 'comments-create',
      limit: 30,
      windowSec: 600,
      by: 'user',
    },
  },
)
