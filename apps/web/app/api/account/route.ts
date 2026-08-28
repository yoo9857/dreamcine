import { z } from 'zod'

import { withRoute } from '@/src/http/handler'
import { deleteAccount } from '@/src/services/auth/delete-account'

const DeleteAccountSchema = z.object({
  confirmation: z.string().trim().min(1).max(40),
  password: z.string().max(200).optional(),
  reason: z.string().trim().max(500).optional(),
})

export const DELETE = withRoute(
  async ({ body, session }) => {
    const input = DeleteAccountSchema.parse(body)
    const result = await deleteAccount({
      userId: session.userId,
      confirmation: input.confirmation,
      ...(input.password === undefined ? {} : { password: input.password }),
      ...(input.reason === undefined ? {} : { reason: input.reason }),
    })
    return { status: 202, body: result }
  },
  {
    auth: 'required',
    rateLimit: {
      bucket: 'account-delete',
      limit: 3,
      windowSec: 3600,
      by: 'user',
    },
  },
)
