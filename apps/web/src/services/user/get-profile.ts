import { NotImplementedError, type UserProfile } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function getProfile(
  _handle: string,
  _session: RouteSession | null,
): Promise<UserProfile> {
  throw new NotImplementedError('T10:getProfile')
}
