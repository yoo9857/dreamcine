import { withRoute } from '@/src/http/handler'
import { accepted } from '@/src/http/response'
import { retryAsset } from '@/src/services/asset/retry-asset'

export const POST = withRoute(
  async ({ session, params }) =>
    accepted(await retryAsset(session, params.id ?? '')),
  {
    auth: 'required',
    rateLimit: { bucket: 'assets', limit: 10, windowSec: 60, by: 'user' },
  },
)
