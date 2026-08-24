import { CompleteUploadSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { accepted, ok } from '@/src/http/response'
import { completeUpload } from '@/src/services/upload/complete-upload'

export const POST = withRoute(
  async ({ session, params, body }) => {
    const outcome = await completeUpload(
      session,
      params.id ?? '',
      parseBody(CompleteUploadSchema, body),
    )
    return outcome.replayed ? ok(outcome.result) : accepted(outcome.result)
  },
  {
    auth: 'required',
    rateLimit: { bucket: 'uploads', limit: 300, windowSec: 60, by: 'user' },
  },
)
