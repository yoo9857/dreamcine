import { CreateReportSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { created } from '@/src/http/response'
import { createReport } from '@/src/services/moderation/create-report'

export const POST = withRoute(
  async ({ session, body }) => {
    const report = await createReport(
      session,
      parseBody(CreateReportSchema, body),
    )
    return created({ id: report.id, status: report.status })
  },
  {
    auth: 'required',
    rateLimit: { bucket: 'reports', limit: 20, windowSec: 86_400, by: 'user' },
  },
)
