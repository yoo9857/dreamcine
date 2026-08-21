import { RequestPasswordResetSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { noContent } from '@/src/http/response'
import { requestPasswordReset } from '@/src/services/auth/request-password-reset'

// 계정이 없어도 204 다. 존재 여부를 노출하지 않는다. (07_AUTH_SECURITY.md §11)
export const POST = withRoute(
  async ({ body }) => {
    await requestPasswordReset(parseBody(RequestPasswordResetSchema, body))
    return noContent()
  },
  {
    auth: 'none',
    rateLimit: { bucket: 'auth', limit: 10, windowSec: 600, by: 'ip' },
  },
)
