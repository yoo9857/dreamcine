import { ReviewReportSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { ok } from '@/src/http/response'
import { reviewReport } from '@/src/services/moderation/review-report'

export const POST = withRoute(
  async ({ session, params, body }) => {
    const report = await reviewReport(
      session,
      params.id ?? '',
      parseBody(ReviewReportSchema, body),
    )
    return ok({
      id: report.id,
      status: report.status,
      handledAt: report.handledAt,
    })
  },
  { auth: 'required' },
)
