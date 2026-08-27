import { z } from 'zod'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { ok } from '@/src/http/response'
import { changeCreatorApplicationStatus } from '@/src/services/moderation/admin-operations'

const Schema = z.object({
  status: z.enum([
    'SUBMITTED',
    'REVIEWING',
    'SHORTLISTED',
    'ACCEPTED',
    'REJECTED',
  ]),
})

export const POST = withRoute(
  async ({ session, params, body }) => {
    const input = parseBody(Schema, body)
    return ok(
      await changeCreatorApplicationStatus(
        session,
        params.id ?? '',
        input.status,
      ),
    )
  },
  { auth: 'required' },
)
