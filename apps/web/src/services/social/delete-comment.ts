import { AppError } from '@aidream/core'
import { findCommentById, softDeleteComment } from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'

export interface DeleteCommentDependencies {
  readonly findComment: typeof findCommentById
  readonly remove: typeof softDeleteComment
}

export function deleteComment(
  session: RouteSession,
  commentId: string,
  dependencies: DeleteCommentDependencies = {
    findComment: findCommentById,
    remove: softDeleteComment,
  },
): Promise<void> {
  return runDeleteComment(session, commentId, dependencies)
}

async function runDeleteComment(
  session: RouteSession,
  commentId: string,
  dependencies: DeleteCommentDependencies,
): Promise<void> {
  const comment = await dependencies.findComment(commentId)
  if (comment === null) throw new AppError('E_COMMENT_NOT_FOUND')
  const moderator =
    session.user.role === 'MODERATOR' || session.user.role === 'ADMIN'
  if (comment.userId !== session.userId && !moderator)
    throw new AppError('E_PERM_NOT_OWNER')
  await dependencies.remove(commentId)
}
