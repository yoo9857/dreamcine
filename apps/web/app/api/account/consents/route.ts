import { z } from 'zod'

import { withRoute } from '@/src/http/handler'
import { updateMarketingConsent } from '@/src/services/auth/consent-preferences'

const UpdateConsentSchema = z.object({ marketing: z.boolean() })

export const PATCH = withRoute(
  async ({ body, session, ip, req }) => {
    const input = UpdateConsentSchema.parse(body)
    const preferences = await updateMarketingConsent({
      userId: session.userId,
      granted: input.marketing,
      ip,
      userAgent: req.headers.get('user-agent'),
    })
    return { status: 200, body: preferences }
  },
  { auth: 'required' },
)
