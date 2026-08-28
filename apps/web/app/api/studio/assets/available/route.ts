import { withRoute } from '@/src/http/handler'
import { ok } from '@/src/http/response'
import { getAvailableStudioAssets } from '@/src/services/studio/get-studio-dashboard'

export const GET = withRoute(
  async ({ session }) => ok(await getAvailableStudioAssets(session)),
  { auth: 'required' },
)
