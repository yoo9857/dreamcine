import { UpdateUserStatusSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { ok } from '@/src/http/response'
import { updateAdminUserStatus } from '@/src/services/moderation/manage-users'

export const POST = withRoute(
  async ({ session, params, body }) => {
    const input = parseBody(UpdateUserStatusSchema, body)
    await updateAdminUserStatus(
      session,
      params.id ?? '',
      input.status,
      input.reason,
    )
    return ok({ id: params.id ?? '', status: input.status })
  },
  { auth: 'required' },
)
