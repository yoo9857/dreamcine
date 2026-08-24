import { withRoute } from '@/src/http/handler'
import { ok } from '@/src/http/response'
import { getAssetStatus } from '@/src/services/asset/get-asset-status'

export const GET = withRoute(
  async ({ session, params }) =>
    ok(await getAssetStatus(session, params.id ?? '')),
  {
    auth: 'required',
    csrf: false,
    rateLimit: { bucket: 'assets', limit: 300, windowSec: 60, by: 'user' },
  },
)
