import {
  AppError,
  LIMITS,
  sanitizeUserText,
  type CommentResponse,
  type CreateCommentInput,
} from '@aidream/core'
import {
  createComment as insertComment,
  findCommentById,
  findCommentEpisodeContext,
  findUserById,
  hasBlockBetween,
} from '@aidream/db'
import { avatarUrl } from '@aidream/storage/cdn'

import type { RouteSession } from '@/src/auth/types'
import { getLogger } from '@/src/lib/logger'
import { notify } from '@/src/services/notification/notify'

export interface CreateCommentDependencies {
  readonly findEpisode: typeof findCommentEpisodeContext
  readonly findParent: typeof findCommentById
  readonly findUser: typeof findUserById
  readonly blocked: typeof hasBlockBetween
  readonly insert: typeof insertComment
  readonly notify: typeof notify
}

export function createComment(
  session: RouteSession,
  episodeId: string,
  input: CreateCommentInput,
  dependencies: CreateCommentDependencies = productionDependencies(),
): Promise<CommentResponse> {
  return runCreateComment(session, episodeId, input, dependencies)
}

async function runCreateComment(
  session: RouteSession,
  episodeId: string,
  input: CreateCommentInput,
  dependencies: CreateCommentDependencies,
): Promise<CommentResponse> {
  const body = sanitizeUserText(input.body)
  if (body.length === 0) throw new AppError('E_VALIDATION', { field: 'body' })
  if (body.length > LIMITS.COMMENT_MAX_LEN)
    throw new AppError('E_COMMENT_TOO_LONG', {
      max: LIMITS.COMMENT_MAX_LEN,
      actual: body.length,
    })

  const episode = await dependencies.findEpisode(episodeId)
  if (episode === null || episode.status !== 'PUBLISHED')
    throw new AppError('E_EPISODE_NOT_FOUND')
  if (episode.commentsOff) throw new AppError('E_COMMENT_DISABLED')
  if (await dependencies.blocked(session.userId, episode.ownerId))
    throw new AppError('E_SOCIAL_BLOCKED')

  if (input.parentId !== undefined) {
    const parent = await dependencies.findParent(input.parentId)
    if (parent === null || parent.episodeId !== episodeId)
      throw new AppError('E_COMMENT_NOT_FOUND')
    if (parent.parentId !== null) throw new AppError('E_COMMENT_DEPTH_EXCEEDED')
  }

  const [comment, user] = await Promise.all([
    dependencies.insert({
      episodeId,
      userId: session.userId,
      body,
      parentId: input.parentId ?? null,
    }),
    dependencies.findUser(session.userId),
  ])
  if (user === null) throw new AppError('E_USER_NOT_FOUND')

  try {
    await dependencies.notify({
      type: 'NEW_COMMENT',
      to: episode.ownerId,
      actorId: session.userId,
      episodeId,
      commentId: comment.id,
    })
  } catch (error: unknown) {
    getLogger().error(
      { err: error, actorId: session.userId, episodeId, commentId: comment.id },
      'comment notification failed',
    )
  }

  return {
    id: comment.id,
    episodeId,
    body: comment.body,
    parentId: comment.parentId,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    deleted: false,
    user: {
      handle: user.handle,
      displayName: user.displayName,
      avatarUrl: avatarUrl(user.avatarKey),
    },
  }
}

function productionDependencies(): CreateCommentDependencies {
  return {
    findEpisode: findCommentEpisodeContext,
    findParent: findCommentById,
    findUser: findUserById,
    blocked: hasBlockBetween,
    insert: insertComment,
    notify,
  }
}
