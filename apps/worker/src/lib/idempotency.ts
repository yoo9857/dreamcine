import { AppError, type VideoAsset } from '@aidream/core'

export type IdempotencyDecision = 'PROCESS' | 'SKIP_MISSING' | 'SKIP_STATE'

export function idempotencyGate(
  asset: VideoAsset | null,
  now: Date,
): IdempotencyDecision {
  if (Number.isNaN(now.getTime())) {
    throw new AppError('E_VALIDATION', { field: 'now' })
  }
  if (asset === null) return 'SKIP_MISSING'
  if (asset.status === 'READY') return 'SKIP_STATE'
  if (asset.status === 'FAILED' && asset.attemptCount >= 3) {
    return 'SKIP_STATE'
  }
  if (asset.status === 'PROBING' || asset.status === 'TRANSCODING') {
    const staleBefore = now.getTime() - 30 * 60 * 1000
    return asset.updatedAt.getTime() <= staleBefore ? 'PROCESS' : 'SKIP_STATE'
  }
  return 'PROCESS'
}
