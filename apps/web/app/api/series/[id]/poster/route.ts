import { z } from 'zod'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { ok } from '@/src/http/response'
import { uploadSeriesPoster } from '@/src/services/series/upload-series-poster'

const PosterUploadSchema = z.object({
  image: z.string().max(6_000_000),
})

export const POST = withRoute(
  async ({ params, session, body }) => {
    const input = parseBody(PosterUploadSchema, body)
    return ok(await uploadSeriesPoster(params.id ?? '', session, input.image))
  },
  {
    auth: 'required',
    rateLimit: {
      bucket: 'series-poster',
      limit: 20,
      windowSec: 3600,
      by: 'user',
    },
  },
)
