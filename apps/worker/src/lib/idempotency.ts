import { NotImplementedError, type VideoAsset } from '@aidream/core'

export type IdempotencyDecision = 'PROCESS' | 'SKIP_MISSING' | 'SKIP_STATE'

export function idempotencyGate(
  asset: VideoAsset | null,
  now: Date,
): IdempotencyDecision {
  void asset
  void now
  throw new NotImplementedError('T06:idempotencyGate')
}
