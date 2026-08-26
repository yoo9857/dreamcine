import { CreateCreatorApplicationSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { created } from '@/src/http/response'
import { submitCreatorApplication } from '@/src/services/creator/submit-application'

export const POST = withRoute(
  async ({ body }) => {
    const application = await submitCreatorApplication(
      parseBody(CreateCreatorApplicationSchema, body),
    )
    return created({
      id: application.id,
      status: application.status,
      updatedAt: application.updatedAt.toISOString(),
    })
  },
  {
    auth: 'none',
    rateLimit: {
      bucket: 'creator-applications',
      limit: 5,
      windowSec: 86_400,
      by: 'ip',
    },
  },
)
