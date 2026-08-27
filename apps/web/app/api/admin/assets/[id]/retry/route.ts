import { withRoute } from '@/src/http/handler'
import { accepted } from '@/src/http/response'
import { retryAdminAsset } from '@/src/services/moderation/admin-operations'

export const POST = withRoute(
  async ({ session, params }) => {
    await retryAdminAsset(session, params.id ?? '')
    return accepted({ id: params.id ?? '', status: 'PENDING' })
  },
  { auth: 'required' },
)
