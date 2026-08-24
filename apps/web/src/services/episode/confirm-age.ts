import type { AgeConfirmInput } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export interface ConfirmAgeInput {
  readonly episodeId: string
  readonly confirmation: AgeConfirmInput
  readonly session: RouteSession | null
  readonly now: Date
}

export interface ConfirmAgeResult {
  readonly setCookie: string
}

export function confirmAge(_input: ConfirmAgeInput): Promise<ConfirmAgeResult> {
  throw new NotImplementedError('T07:confirmAge')
}
