import { VerifyEmailSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { ok } from '@/src/http/response'
import { verifyEmail } from '@/src/services/auth/verify-email'

export const POST = withRoute(
  async ({ body }) => ok(await verifyEmail(parseBody(VerifyEmailSchema, body))),
  {
    auth: 'none',
    rateLimit: { bucket: 'auth', limit: 10, windowSec: 600, by: 'ip' },
  },
)
