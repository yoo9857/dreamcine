import { NotImplementedError } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function followUser(
  _session: RouteSession,
  _handle: string,
): Promise<{ readonly followerCount: number }> {
  throw new NotImplementedError('T10:followUser')
}

export function unfollowUser(
  _session: RouteSession,
  _handle: string,
): Promise<{ readonly followerCount: number }> {
  throw new NotImplementedError('T10:unfollowUser')
}
