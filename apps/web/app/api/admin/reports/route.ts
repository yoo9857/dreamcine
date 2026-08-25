import { ReportQueueQuerySchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { paginated } from '@/src/http/response'
import { listReportQueue } from '@/src/services/moderation/list-report-queue'

export const GET = withRoute(
  async ({ session, query }) => {
    const page = await listReportQueue(
      session,
      ReportQueueQuerySchema.parse(Object.fromEntries(query)),
    )
    return paginated(page.items, page.nextCursor)
  },
  { auth: 'required' },
)
