import { NotImplementedError } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function blockUser(
  _session: RouteSession,
  _handle: string,
): Promise<void> {
  throw new NotImplementedError('T10:blockUser')
}
