import {
  AppError,
  LIMITS,
  sanitizeUserText,
  type CommentResponse,
  type UpdateCommentInput,
} from '@aidream/core'
import { findCommentById, findUserById, updateCommentBody } from '@aidream/db'
import { avatarUrl } from '@aidream/storage/cdn'

import type { RouteSession } from '@/src/auth/types'

export interface UpdateCommentDependencies {
  readonly findComment: typeof findCommentById
  readonly findUser: typeof findUserById
  readonly update: typeof updateCommentBody
  readonly now: () => Date
}

export function updateComment(
  session: RouteSession,
  commentId: string,
  input: UpdateCommentInput,
  dependencies: UpdateCommentDependencies = {
    findComment: findCommentById,
    findUser: findUserById,
    update: updateCommentBody,
    now: () => new Date(),
  },
): Promise<CommentResponse> {
  return runUpdateComment(session, commentId, input, dependencies)
}

async function runUpdateComment(
  session: RouteSession,
  commentId: string,
  input: UpdateCommentInput,
  dependencies: UpdateCommentDependencies,
): Promise<CommentResponse> {
  const existing = await dependencies.findComment(commentId)
  if (existing === null) throw new AppError('E_COMMENT_NOT_FOUND')
  if (existing.userId !== session.userId) throw new AppError('E_PERM_DENIED')
  if (
    dependencies.now().getTime() - existing.createdAt.getTime() >
    LIMITS.COMMENT_EDIT_WINDOW_MIN * 60 * 1000
  )
    throw new AppError('E_PERM_DENIED')
  const body = sanitizeUserText(input.body)
  if (body.length === 0) throw new AppError('E_VALIDATION', { field: 'body' })
  if (body.length > LIMITS.COMMENT_MAX_LEN)
    throw new AppError('E_COMMENT_TOO_LONG')

  const [updated, user] = await Promise.all([
    dependencies.update(commentId, body),
    dependencies.findUser(session.userId),
  ])
  if (user === null) throw new AppError('E_USER_NOT_FOUND')
  return {
    id: updated.id,
    episodeId: updated.episodeId,
    body: updated.body,
    parentId: updated.parentId,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    deleted: false,
    user: {
      handle: user.handle,
      displayName: user.displayName,
      avatarUrl: avatarUrl(user.avatarKey),
    },
  }
}
