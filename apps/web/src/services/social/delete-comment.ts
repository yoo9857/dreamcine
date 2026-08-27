import { AppError, can } from '@aidream/core'
import { findCommentById, softDeleteComment } from '@aidream/db'

import { actorFromSession } from '@/src/auth/actor'
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
  /*
    소유 판정을 직접 하지 않고 `can()` 에 댓글 작성자를 넘긴다. 예전에는
    작성자 비교와 모더레이터 비교가 이 파일에 흩어져 있었고, 그래서
    07_AUTH_SECURITY.md §2 의 "권한 판정은 can() 밖에 없다" 가 깨져 있었다.
  */
  if (
    !can(actorFromSession(session), 'comment.delete', {
      ownerId: comment.userId,
    })
  ) {
    throw new AppError('E_PERM_NOT_OWNER')
  }
  await dependencies.remove(commentId)
}
