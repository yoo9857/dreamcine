import { AdminUserQuerySchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { paginated } from '@/src/http/response'
import { listAdminUsers } from '@/src/services/moderation/manage-users'

export const GET = withRoute(
  async ({ session, query }) => {
    const page = await listAdminUsers(
      session,
      AdminUserQuerySchema.parse(Object.fromEntries(query)),
    )
    return paginated(page.items, page.nextCursor)
  },
  { auth: 'required' },
)
