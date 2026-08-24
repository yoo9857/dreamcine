import type { SaveProgressInput } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export interface SaveProgressServiceInput {
  readonly episodeId: string
  readonly progress: SaveProgressInput
  readonly session: RouteSession
  readonly now: Date
}

export function saveProgress(_input: SaveProgressServiceInput): Promise<void> {
  throw new NotImplementedError('T07:saveProgress')
}
