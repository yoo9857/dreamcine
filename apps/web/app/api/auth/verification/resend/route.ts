import { RequestPasswordResetSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { noContent } from '@/src/http/response'
import { resendVerification } from '@/src/services/auth/resend-verification'

export const POST = withRoute(
  async ({ body }) => {
    await resendVerification(parseBody(RequestPasswordResetSchema, body))
    return noContent()
  },
  {
    auth: 'none',
    rateLimit: {
      bucket: 'verification-resend',
      limit: 3,
      windowSec: 600,
      by: 'ip',
    },
  },
)
