import { withRoute } from '@/src/http/handler'
import { ok } from '@/src/http/response'
import { followUser, unfollowUser } from '@/src/services/social/follow-user'

const options = {
  auth: 'required',
  rateLimit: { bucket: 'social-follow', limit: 300, windowSec: 60, by: 'user' },
} as const

export const PUT = withRoute(
  async ({ params, session }) =>
    ok(await followUser(session, params.handle ?? '')),
  options,
)

export const DELETE = withRoute(
  async ({ params, session }) =>
    ok(await unfollowUser(session, params.handle ?? '')),
  options,
)
