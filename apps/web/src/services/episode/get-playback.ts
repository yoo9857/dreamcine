import type { PlaybackResponse } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export interface GetPlaybackInput {
  readonly episodeId: string
  readonly session: RouteSession | null
  readonly cookieHeader: string | null
  readonly now: Date
}

export function getPlayback(
  _input: GetPlaybackInput,
): Promise<PlaybackResponse> {
  throw new NotImplementedError('T07:getPlayback')
}
