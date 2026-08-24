import { CreateUploadSchema } from '@aidream/core'

import { withRoute, type RouteOptions } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { created } from '@/src/http/response'
import { createUploadSession } from '@/src/services/upload/create-upload-session'

const CREATE_UPLOAD_OPTIONS = {
  auth: 'required',
  rateLimit: {
    bucket: 'uploads',
    limit: (capacity) => capacity.uploadHourlyCount,
    windowSec: 60 * 60,
    by: 'user',
  },
} as const satisfies RouteOptions

export const POST = withRoute(
  async ({ session, body }) =>
    created(
      await createUploadSession(session, parseBody(CreateUploadSchema, body)),
    ),
  CREATE_UPLOAD_OPTIONS,
)
