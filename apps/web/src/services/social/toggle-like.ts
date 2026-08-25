import { NotImplementedError } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export interface LikeResult {
  readonly likeCount: number
  readonly liked: boolean
}

export function addLike(
  _session: RouteSession,
  _episodeId: string,
): Promise<LikeResult> {
  throw new NotImplementedError('T10:addLike')
}

export function removeLike(
  _session: RouteSession,
  _episodeId: string,
): Promise<LikeResult> {
  throw new NotImplementedError('T10:removeLike')
}
