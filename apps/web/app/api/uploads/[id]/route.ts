import { withRoute } from '@/src/http/handler'
import { ok } from '@/src/http/response'
import { getUploadSession } from '@/src/services/upload/get-upload-session'

export const GET = withRoute(
  async ({ session, params }) =>
    ok(await getUploadSession(session, params.id ?? '')),
  {
    auth: 'required',
    csrf: false,
    rateLimit: { bucket: 'uploads', limit: 300, windowSec: 60, by: 'user' },
  },
)
