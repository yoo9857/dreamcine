import { withRoute } from '@/src/http/handler'
import { ok } from '@/src/http/response'
import { blockUser } from '@/src/services/social/block-user'
import { unblockUser } from '@/src/services/social/unblock-user'

const options = {
  auth: 'required',
  rateLimit: { bucket: 'social-block', limit: 300, windowSec: 60, by: 'user' },
} as const

export const PUT = withRoute(async ({ params, session }) => {
  await blockUser(session, params.handle ?? '')
  return ok({ blocked: true })
}, options)

export const DELETE = withRoute(async ({ params, session }) => {
  await unblockUser(session, params.handle ?? '')
  return ok({ blocked: false })
}, options)
