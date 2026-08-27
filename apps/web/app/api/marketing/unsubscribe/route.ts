import { AppError } from '@aidream/core'

import { withRoute } from '@/src/http/handler'
import { verifyMarketingUnsubscribeToken } from '@/src/lib/marketing-unsubscribe'
import { updateMarketingConsent } from '@/src/services/auth/consent-preferences'

function readUserId(token: string): string {
  const secret = process.env.AUTH_SECRET
  if (secret === undefined || secret === '') throw new AppError('E_INTERNAL')
  const userId = verifyMarketingUnsubscribeToken({
    token,
    now: new Date(),
    secret,
  })
  if (userId === null) throw new AppError('E_VALIDATION')
  return userId
}

export const GET = withRoute(
  ({ query }) => {
    const token = query.get('token') ?? ''
    readUserId(token)
    return Promise.resolve({
      status: 303,
      headers: {
        location: `/unsubscribe?token=${encodeURIComponent(token)}`,
      },
    })
  },
  { auth: 'none', csrf: false },
)

export const POST = withRoute(
  async ({ query, ip, req }) => {
    const userId = readUserId(query.get('token') ?? '')
    await updateMarketingConsent({
      userId,
      granted: false,
      ip,
      userAgent: req.headers.get('user-agent'),
    })
    return { status: 204 }
  },
  { auth: 'none', csrf: false },
)
