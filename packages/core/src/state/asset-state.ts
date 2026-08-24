import { NotImplementedError } from '../errors/not-implemented.js'
import type { AssetStatus } from '../enums.js'

export interface AssetTransitionContext {
  readonly attemptCount: number
}

export function canTransitionAsset(
  from: AssetStatus,
  to: AssetStatus,
  context: AssetTransitionContext,
): boolean {
  void from
  void to
  void context
  throw new NotImplementedError('T06:assetState')
}
