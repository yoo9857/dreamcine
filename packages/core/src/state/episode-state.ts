import type { AssetStatus, EpisodeStatus, UserRole } from '../enums.js'
import type { ErrorCode } from '../errors/codes.js'
import { NotImplementedError } from '../errors/not-implemented.js'

export type TransitionActor =
  | {
      readonly kind: 'USER'
      readonly role: UserRole
      readonly isOwner: boolean
    }
  | { readonly kind: 'SCHEDULER' }

export interface TransitionContext {
  readonly current: EpisodeStatus
  readonly next: EpisodeStatus
  readonly assetStatus: AssetStatus | null
  readonly aiDisclosure: string | null
  readonly publishAt: Date | null
  readonly publishedAt: Date | null
  readonly now: Date
  readonly actor: TransitionActor
}

export interface TransitionPatch {
  readonly publishAt: Date | null
  readonly publishedAt: Date | null
}

export type TransitionVerdict =
  | { readonly ok: true; readonly patch: TransitionPatch }
  | { readonly ok: false; readonly code: ErrorCode }

export function checkEpisodeTransition(
  _context: TransitionContext,
): TransitionVerdict {
  throw new NotImplementedError('T08:checkEpisodeTransition')
}
