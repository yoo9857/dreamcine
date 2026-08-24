import { AppError } from '@aidream/core'
import {
  findAssetById,
  findUploadSessionById,
  listRenditionsByAsset,
} from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'
import { getRedis } from '@/src/lib/redis'

export async function getAssetStatus(session: RouteSession, assetId: string) {
  const asset = await findAssetById(assetId)
  if (asset === null) throw new AppError('E_ASSET_NOT_FOUND', { assetId })
  const upload =
    asset.uploadId === null ? null : await findUploadSessionById(asset.uploadId)
  if (upload?.userId !== session.userId) {
    throw new AppError('E_PERM_NOT_OWNER', { assetId })
  }
  const renditions = await listRenditionsByAsset(assetId)
  let progress = asset.status === 'READY' ? 100 : 0
  if (asset.status === 'TRANSCODING') {
    try {
      const stored = await getRedis().get(`asset:progress:${assetId}`)
      const parsed = Number(stored)
      if (stored !== null && Number.isFinite(parsed)) {
        progress = Math.min(100, Math.max(0, parsed))
      }
    } catch (error: unknown) {
      if (!(error instanceof AppError)) throw error
    }
  }
  return {
    id: asset.id,
    status: asset.status,
    progress,
    ...(asset.durationSec === null ? {} : { durationSec: asset.durationSec }),
    ...(asset.width === null ? {} : { width: asset.width }),
    ...(asset.height === null ? {} : { height: asset.height }),
    renditions: renditions.map((rendition) => ({
      name: rendition.name,
      width: rendition.width,
      height: rendition.height,
      bitrateKbps: rendition.bitrateKbps,
    })),
    ...(asset.errorCode === null ? {} : { errorCode: asset.errorCode }),
    attemptCount: asset.attemptCount,
  }
}
