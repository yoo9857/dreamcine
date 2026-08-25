import {
  NotImplementedError,
  type CommentListQuery,
  type CommentThreadItem,
  type Page,
} from '@aidream/core'

export function listComments(
  _episodeId: string,
  _query: CommentListQuery,
): Promise<Page<CommentThreadItem>> {
  throw new NotImplementedError('T10:listComments')
}
