import { withRoute } from '@/src/http/handler'
import { noContent } from '@/src/http/response'
import { abortUpload } from '@/src/services/upload/abort-upload'

export const POST = withRoute(
  async ({ session, params }) => {
    await abortUpload(session, params.id ?? '')
    return noContent()
  },
  {
    auth: 'required',
    rateLimit: { bucket: 'uploads', limit: 300, windowSec: 60, by: 'user' },
  },
)
