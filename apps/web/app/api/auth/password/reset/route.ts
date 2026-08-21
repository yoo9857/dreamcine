import { ResetPasswordSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { noContent } from '@/src/http/response'
import { resetPassword } from '@/src/services/auth/reset-password'

export const POST = withRoute(
  async ({ body }) => {
    await resetPassword(parseBody(ResetPasswordSchema, body))
    return noContent()
  },
  {
    auth: 'none',
    rateLimit: { bucket: 'auth', limit: 10, windowSec: 600, by: 'ip' },
  },
)
