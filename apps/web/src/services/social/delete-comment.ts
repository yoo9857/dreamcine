import { NotImplementedError } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function deleteComment(
  _session: RouteSession,
  _commentId: string,
): Promise<void> {
  throw new NotImplementedError('T10:deleteComment')
}
