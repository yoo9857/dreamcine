import { CreateSeriesSchema, SeriesListQuerySchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { created, paginated } from '@/src/http/response'
import { createSeries } from '@/src/services/series/create-series'
import { listSeries } from '@/src/services/series/list-series'

export const GET = withRoute(
  async ({ query }) => {
    const page = await listSeries(
      SeriesListQuerySchema.parse(Object.fromEntries(query)),
    )
    return paginated(page.items, page.nextCursor)
  },
  { auth: 'none' },
)

export const POST = withRoute(
  async ({ session, body }) =>
    created(await createSeries(session, parseBody(CreateSeriesSchema, body))),
  { auth: 'required' },
)
