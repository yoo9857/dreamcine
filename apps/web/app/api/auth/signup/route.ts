import { SignupSchema } from '@aidream/core'
import { z } from 'zod'

import { withRoute } from '@/src/http/handler'
import { parseBody } from '@/src/http/parse'
import { created } from '@/src/http/response'
import { signup } from '@/src/services/auth/signup'

const SignupRequestSchema = SignupSchema.extend({
  plan: z.literal('ads-standard').optional(),
  lang: z.enum(['ko', 'en']).optional(),
  market: z.enum(['kr', 'us']).optional(),
})

export const POST = withRoute(
  async ({ body }) => {
    const { plan, lang, market, ...account } = parseBody(
      SignupRequestSchema,
      body,
    )
    return created(
      await signup(account, {
        ...(plan === undefined ? {} : { plan }),
        ...(lang === undefined ? {} : { lang }),
        ...(market === undefined ? {} : { market }),
      }),
    )
  },
  {
    auth: 'none',
    rateLimit: { bucket: 'auth', limit: 10, windowSec: 600, by: 'ip' },
  },
)
