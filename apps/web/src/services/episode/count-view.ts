import { NotImplementedError } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export interface CountViewInput {
  readonly episodeId: string
  readonly session: RouteSession | null
  readonly ip: string
  readonly now: Date
}

export function countView(_input: CountViewInput): Promise<void> {
  throw new NotImplementedError('T07:countView')
}
