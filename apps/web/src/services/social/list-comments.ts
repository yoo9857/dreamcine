import {
  type CommentListQuery,
  type CommentThreadItem,
  type Page,
} from '@aidream/core'
import { listCommentThreadsByEpisode, type CommentThreadRow } from '@aidream/db'
import { avatarUrl } from '@aidream/storage/cdn'

export interface ListCommentsDependencies {
  readonly list: typeof listCommentThreadsByEpisode
}

export function listComments(
  episodeId: string,
  query: CommentListQuery,
  dependencies: ListCommentsDependencies = {
    list: listCommentThreadsByEpisode,
  },
): Promise<Page<CommentThreadItem>> {
  return runListComments(episodeId, query, dependencies)
}

async function runListComments(
  episodeId: string,
  query: CommentListQuery,
  dependencies: ListCommentsDependencies,
): Promise<Page<CommentThreadItem>> {
  const page = await dependencies.list({
    episodeId,
    limit: query.limit,
    ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
  })
  return {
    items: page.items.map((row) => ({
      ...toResponse(row),
      replies: row.replies.map(toResponse),
    })),
    nextCursor: page.nextCursor,
  }
}

function toResponse(
  row: Omit<CommentThreadRow, 'replies'>,
): CommentThreadItem['replies'][number] {
  const deleted = row.deletedAt !== null
  return {
    id: row.id,
    episodeId: row.episodeId,
    parentId: row.parentId,
    body: deleted ? '삭제된 댓글입니다' : row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deleted,
    user: {
      handle: row.user.handle,
      displayName: row.user.displayName,
      avatarUrl: avatarUrl(row.user.avatarKey),
      tier: row.user.tier,
      isVerified: row.user.verifiedAt !== null,
    },
  }
}
