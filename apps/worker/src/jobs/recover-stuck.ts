import { AppError } from '@aidream/core'
import { listStuckPendingAssets } from '@aidream/db'
import { enqueue, QUEUE } from '@aidream/queue'

export interface RecoverStuckDependencies {
  readonly findStuck: (before: Date) => Promise<readonly { id: string }[]>
  readonly enqueueAsset: (assetId: string) => Promise<void>
}

export function recoverStuck(
  olderThanMinutes: number,
  now: Date,
  dependencies: RecoverStuckDependencies = PRODUCTION_DEPENDENCIES,
): Promise<number> {
  return runRecovery(olderThanMinutes, now, dependencies)
}

async function runRecovery(
  olderThanMinutes: number,
  now: Date,
  dependencies: RecoverStuckDependencies,
): Promise<number> {
  if (!Number.isInteger(olderThanMinutes) || olderThanMinutes <= 0) {
    throw new AppError('E_VALIDATION', { field: 'olderThanMinutes' })
  }
  const before = new Date(now.getTime() - olderThanMinutes * 60 * 1000)
  const assets = await dependencies.findStuck(before)
  for (const asset of assets) {
    await dependencies.enqueueAsset(asset.id)
  }
  return assets.length
}

const PRODUCTION_DEPENDENCIES: RecoverStuckDependencies = {
  findStuck: (before) => listStuckPendingAssets(before, 1000),
  enqueueAsset: (assetId) =>
    enqueue(
      QUEUE.VIDEO_TRANSCODE,
      { assetId },
      {
        jobId: assetId,
        attempts: 3,
        backoff: { type: 'transcode' },
      },
    ),
}
