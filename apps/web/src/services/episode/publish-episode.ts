import {
  NotImplementedError,
  type PublishEpisodeInput,
  type PublishEpisodeResponse,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export interface PublishEpisodeServiceInput {
  readonly episodeId: string
  readonly session: RouteSession
  readonly request: PublishEpisodeInput
  readonly now: Date
}

export function publishEpisode(
  _input: PublishEpisodeServiceInput,
): Promise<PublishEpisodeResponse> {
  throw new NotImplementedError('T08:publishEpisode')
}
