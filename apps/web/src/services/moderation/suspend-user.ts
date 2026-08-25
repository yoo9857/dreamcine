import { NotImplementedError, type UserStatus } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function suspendUser(
  _session: RouteSession,
  _userId: string,
  _status: UserStatus,
  _reason: string,
): Promise<void> {
  throw new NotImplementedError('T12:suspendUser')
}
