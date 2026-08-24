import { SignPartsSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { ok } from '@/src/http/response'
import { signMoreParts } from '@/src/services/upload/sign-more-parts'

export const POST = withRoute(
  async ({ session, params, body }) =>
    ok(
      await signMoreParts(
        session,
        params.id ?? '',
        parseBody(SignPartsSchema, body),
      ),
    ),
  {
    auth: 'required',
    rateLimit: { bucket: 'uploads', limit: 300, windowSec: 60, by: 'user' },
  },
)
