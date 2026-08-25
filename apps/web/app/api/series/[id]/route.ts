import { UpdateSeriesSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { noContent, ok } from '@/src/http/response'
import { deleteSeries } from '@/src/services/series/delete-series'
import { getSeries } from '@/src/services/series/get-series'
import { updateSeries } from '@/src/services/series/update-series'

export const GET = withRoute(
  async ({ params }) => ok(await getSeries(params.id ?? '')),
  { auth: 'none' },
)

export const PATCH = withRoute(
  async ({ params, session, body }) =>
    ok(
      await updateSeries(
        params.id ?? '',
        session,
        parseBody(UpdateSeriesSchema, body),
      ),
    ),
  { auth: 'required' },
)

export const DELETE = withRoute(
  async ({ params, session }) => {
    await deleteSeries(params.id ?? '', session)
    return noContent()
  },
  { auth: 'required' },
)
