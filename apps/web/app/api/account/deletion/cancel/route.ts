import { z } from 'zod'

import { withRoute } from '@/src/http/handler'
import { cancelAccountDeletion } from '@/src/services/auth/cancel-account-deletion'

const CancelDeletionSchema = z.object({
  token: z.string().min(32).max(200),
})

export const POST = withRoute(
  async ({ body }) => {
    const input = CancelDeletionSchema.parse(body)
    await cancelAccountDeletion(input)
    return { status: 200, body: { restored: true } }
  },
  {
    auth: 'none',
    rateLimit: {
      bucket: 'account-deletion-cancel',
      limit: 10,
      windowSec: 600,
      by: 'ip',
    },
  },
)
