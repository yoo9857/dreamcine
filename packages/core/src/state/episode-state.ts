import type { AssetStatus, EpisodeStatus, UserRole } from '../enums.js'
import type { ErrorCode } from '../errors/codes.js'

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
  context: TransitionContext,
): TransitionVerdict {
  const { current, next, actor } = context

  if (current === 'REMOVED' || current === next) {
    return { ok: false, code: 'E_EPISODE_INVALID_TRANSITION' }
  }

  if (next === 'REMOVED') {
    if (actor.kind !== 'USER' || (!actor.isOwner && actor.role !== 'ADMIN')) {
      return { ok: false, code: 'E_EPISODE_INVALID_TRANSITION' }
    }
    return { ok: true, patch: retainedPatch(context) }
  }

  if (current === 'SCHEDULED' && next === 'DRAFT') {
    if (actor.kind !== 'SCHEDULER') {
      return { ok: false, code: 'E_EPISODE_INVALID_TRANSITION' }
    }
    return {
      ok: true,
      patch: { publishAt: null, publishedAt: context.publishedAt },
    }
  }

  if (current === 'DRAFT' && next === 'SCHEDULED') {
    if (!isOwner(actor)) {
      return { ok: false, code: 'E_EPISODE_INVALID_TRANSITION' }
    }
    if (context.publishAt === null || context.publishAt <= context.now) {
      return { ok: false, code: 'E_EPISODE_SCHEDULE_IN_PAST' }
    }
    return { ok: true, patch: retainedPatch(context) }
  }

  if (current === 'PUBLISHED' && next === 'HIDDEN') {
    if (
      actor.kind !== 'USER' ||
      (!actor.isOwner && actor.role !== 'MODERATOR' && actor.role !== 'ADMIN')
    ) {
      return { ok: false, code: 'E_EPISODE_INVALID_TRANSITION' }
    }
    return { ok: true, patch: retainedPatch(context) }
  }

  const publishes =
    next === 'PUBLISHED' &&
    (current === 'DRAFT' || current === 'SCHEDULED' || current === 'HIDDEN')
  if (!publishes) {
    return { ok: false, code: 'E_EPISODE_INVALID_TRANSITION' }
  }
  if (
    (current === 'SCHEDULED' &&
      actor.kind !== 'SCHEDULER' &&
      !isOwner(actor)) ||
    (current !== 'SCHEDULED' && !isOwner(actor))
  ) {
    return { ok: false, code: 'E_EPISODE_INVALID_TRANSITION' }
  }
  if (context.assetStatus !== 'READY') {
    return { ok: false, code: 'E_EPISODE_ASSET_NOT_READY' }
  }
  if (context.aiDisclosure?.trim() === '') {
    return { ok: false, code: 'E_EPISODE_AI_DISCLOSURE_REQUIRED' }
  }
  if (context.aiDisclosure === null) {
    return { ok: false, code: 'E_EPISODE_AI_DISCLOSURE_REQUIRED' }
  }
  return {
    ok: true,
    patch: {
      publishAt: null,
      publishedAt: context.publishedAt ?? context.now,
    },
  }
}

function isOwner(actor: TransitionActor): boolean {
  return actor.kind === 'USER' && actor.isOwner
}

function retainedPatch(context: TransitionContext): TransitionPatch {
  return {
    publishAt: context.publishAt,
    publishedAt: context.publishedAt,
  }
}
