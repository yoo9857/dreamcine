import { NotImplementedError } from '@aidream/core'

import { withRoute } from '@/src/http/handler'

const MY_PROFILE_RATE_LIMIT = {
  bucket: 'me',
  limit: 300,
  windowSec: 60,
  by: 'user',
} as const

export const GET = withRoute(
  () => Promise.reject(new NotImplementedError('T03:meRoute')),
  { auth: 'required', csrf: false, rateLimit: MY_PROFILE_RATE_LIMIT },
)

export const PATCH = withRoute(
  () => Promise.reject(new NotImplementedError('T03:meRoute')),
  { auth: 'required', rateLimit: MY_PROFILE_RATE_LIMIT },
)
