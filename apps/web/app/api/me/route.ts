import { UpdateProfileSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { ok } from '@/src/http/response'
import { getMe } from '@/src/services/auth/get-me'
import { updateMe } from '@/src/services/auth/update-me'

const MY_PROFILE_RATE_LIMIT = {
  bucket: 'me',
  limit: 300,
  windowSec: 60,
  by: 'user',
} as const

export const GET = withRoute(
  async ({ session }) => ok(await getMe(session.userId)),
  { auth: 'required', csrf: false, rateLimit: MY_PROFILE_RATE_LIMIT },
)

export const PATCH = withRoute(
  async ({ session, body }) =>
    ok(await updateMe(session.userId, parseBody(UpdateProfileSchema, body))),
  { auth: 'required', rateLimit: MY_PROFILE_RATE_LIMIT },
)
