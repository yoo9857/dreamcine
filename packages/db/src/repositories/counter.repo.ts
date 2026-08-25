import { NotImplementedError } from '@aidream/core'

export interface CounterMismatch {
  readonly entity: 'episode' | 'user'
  readonly id: string
  readonly field: 'viewCount' | 'likeCount' | 'commentCount' | 'followerCount'
  readonly stored: string
  readonly actual: string
}

export function incrementEpisodeViews(
  _episodeId: string,
  _by: bigint,
): Promise<void> {
  throw new NotImplementedError('T10:incrementEpisodeViews')
}

export function reconcileRecentCounters(
  _changedSince: Date,
): Promise<readonly CounterMismatch[]> {
  throw new NotImplementedError('T10:reconcileRecentCounters')
}
