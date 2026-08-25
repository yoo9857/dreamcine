import {
  NotImplementedError,
  type CommentResponse,
  type CreateCommentInput,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function createComment(
  _session: RouteSession,
  _episodeId: string,
  _input: CreateCommentInput,
): Promise<CommentResponse> {
  throw new NotImplementedError('T10:createComment')
}
