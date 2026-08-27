import { isGrantableRole } from '@aidream/core'
import { z } from 'zod'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { ok } from '@/src/http/response'
import { changeUserRole } from '@/src/services/moderation/admin-operations'

const Schema = z.object({
  role: z.string().refine(isGrantableRole),
  reason: z.string().trim().min(2).max(500),
})

export const POST = withRoute(
  async ({ session, params, body }) => {
    const input = parseBody(Schema, body)
    await changeUserRole(session, params.id ?? '', input.role, input.reason)
    return ok({ id: params.id ?? '', role: input.role })
  },
  { auth: 'required' },
)
