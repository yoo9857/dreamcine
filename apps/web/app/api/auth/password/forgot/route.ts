import { NotImplementedError } from '@aidream/core'

import { withRoute } from '@/src/http/handler'

export const POST = withRoute(
  () => Promise.reject(new NotImplementedError('T03:forgotRoute')),
  {
    auth: 'none',
    rateLimit: { bucket: 'auth', limit: 10, windowSec: 600, by: 'ip' },
  },
)
