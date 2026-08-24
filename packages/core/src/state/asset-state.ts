import type { AssetStatus } from '../enums.js'

export interface AssetTransitionContext {
  readonly attemptCount: number
}

export function canTransitionAsset(
  from: AssetStatus,
  to: AssetStatus,
  context: AssetTransitionContext,
): boolean {
  if (from === 'FAILED' && to === 'PENDING') {
    return context.attemptCount < 3
  }

  const transitions: Readonly<Record<AssetStatus, readonly AssetStatus[]>> = {
    PENDING: ['PROBING'],
    PROBING: ['TRANSCODING', 'FAILED'],
    TRANSCODING: ['READY', 'FAILED'],
    READY: [],
    FAILED: [],
  }
  return transitions[from].includes(to)
}
