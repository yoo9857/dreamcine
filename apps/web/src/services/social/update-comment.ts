import {
  NotImplementedError,
  type CommentResponse,
  type UpdateCommentInput,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function updateComment(
  _session: RouteSession,
  _commentId: string,
  _input: UpdateCommentInput,
): Promise<CommentResponse> {
  throw new NotImplementedError('T10:updateComment')
}
