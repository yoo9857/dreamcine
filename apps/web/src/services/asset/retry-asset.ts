import { AppError, canTransitionAsset } from '@aidream/core'
import {
  findAssetById,
  findUploadSessionById,
  updateAssetStatus,
} from '@aidream/db'
import { QUEUE, retryJob } from '@aidream/queue'

import type { RouteSession } from '@/src/auth/types'

export async function retryAsset(
  session: RouteSession,
  assetId: string,
): Promise<{ id: string; status: 'PENDING' }> {
  const asset = await findAssetById(assetId)
  if (asset === null) throw new AppError('E_ASSET_NOT_FOUND', { assetId })
  const upload =
    asset.uploadId === null ? null : await findUploadSessionById(asset.uploadId)
  if (upload?.userId !== session.userId) {
    throw new AppError('E_PERM_NOT_OWNER', { assetId })
  }
  if (
    asset.status !== 'FAILED' ||
    !canTransitionAsset('FAILED', 'PENDING', {
      attemptCount: asset.attemptCount,
    })
  ) {
    throw new AppError('E_ASSET_NOT_READY', {
      assetId,
      status: asset.status,
      attemptCount: asset.attemptCount,
    })
  }
  await updateAssetStatus(assetId, 'PENDING', {
    errorCode: null,
    errorDetail: null,
  })
  await retryJob(QUEUE.VIDEO_TRANSCODE, assetId, { assetId })
  return { id: assetId, status: 'PENDING' }
}
