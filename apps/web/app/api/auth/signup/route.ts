import { SignupSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { created } from '@/src/http/response'
import { signup } from '@/src/services/auth/signup'

export const POST = withRoute(
  async ({ body }) => created(await signup(parseBody(SignupSchema, body))),
  {
    auth: 'none',
    rateLimit: { bucket: 'auth', limit: 10, windowSec: 600, by: 'ip' },
  },
)
