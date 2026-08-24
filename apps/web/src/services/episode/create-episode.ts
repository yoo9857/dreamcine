import {
  NotImplementedError,
  type CreateEpisodeInput,
  type EpisodeResponse,
} from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export function createEpisode(
  _session: RouteSession,
  _input: CreateEpisodeInput,
): Promise<EpisodeResponse> {
  throw new NotImplementedError('T08:createEpisode')
}
