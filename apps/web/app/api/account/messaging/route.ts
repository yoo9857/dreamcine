import { UpdateMessagingPreferenceSchema } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { ok } from '@/src/http/response'
import {
  getMessagingPreference,
  updateMessagingPreference,
} from '@/src/services/message/conversation-queries'

export const GET = withRoute(
  async ({ session }) => ok(await getMessagingPreference(session)),
  { auth: 'required' },
)

export const PATCH = withRoute(
  async ({ body, session }) =>
    ok(
      await updateMessagingPreference(
        session,
        parseBody(UpdateMessagingPreferenceSchema, body).dmPolicy,
      ),
    ),
  { auth: 'required' },
)
