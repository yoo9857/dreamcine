import { withRoute } from '@/src/http/handler'
import { ok } from '@/src/http/response'
import { addLike, removeLike } from '@/src/services/social/toggle-like'

const options = {
  auth: 'required',
  rateLimit: { bucket: 'social-like', limit: 300, windowSec: 60, by: 'user' },
} as const

export const PUT = withRoute(
  async ({ params, session }) => ok(await addLike(session, params.id ?? '')),
  options,
)

export const DELETE = withRoute(
  async ({ params, session }) => ok(await removeLike(session, params.id ?? '')),
  options,
)
