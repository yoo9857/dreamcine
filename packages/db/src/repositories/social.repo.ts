import type { Comment, Notification, Page } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

export interface CreateCommentData {
  episodeId: string
  userId: string
  parentId?: string | null
  body: string
}

export function followUser(
  _followerId: string,
  _followingId: string,
): Promise<void> {
  throw new NotImplementedError('T02:followUser')
}

export function unfollowUser(
  _followerId: string,
  _followingId: string,
): Promise<void> {
  throw new NotImplementedError('T02:unfollowUser')
}

export function blockUser(
  _blockerId: string,
  _blockedId: string,
): Promise<void> {
  throw new NotImplementedError('T02:blockUser')
}

export function likeEpisode(
  _userId: string,
  _episodeId: string,
): Promise<void> {
  throw new NotImplementedError('T02:likeEpisode')
}

export function unlikeEpisode(
  _userId: string,
  _episodeId: string,
): Promise<void> {
  throw new NotImplementedError('T02:unlikeEpisode')
}

export function createComment(_input: CreateCommentData): Promise<Comment> {
  throw new NotImplementedError('T02:createComment')
}

export function listCommentsByEpisode(_options: {
  episodeId: string
  limit: number
  cursor?: string
  includeDeleted?: false
}): Promise<Page<Comment>> {
  throw new NotImplementedError('T02:listCommentsByEpisode')
}

export function softDeleteComment(_id: string): Promise<Comment> {
  throw new NotImplementedError('T02:softDeleteComment')
}

export function listNotifications(_options: {
  userId: string
  limit: number
  cursor?: string
}): Promise<Page<Notification>> {
  throw new NotImplementedError('T02:listNotifications')
}

export function markNotificationRead(
  _id: string,
  _userId: string,
): Promise<Notification> {
  throw new NotImplementedError('T02:markNotificationRead')
}
