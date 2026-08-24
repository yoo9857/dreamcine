import type { UploadSession, VideoAsset } from '@aidream/core'
import {
  deleteAssetById,
  listAssetsForCleanup,
  listExpiredUploadSessions,
  updateUploadStatus,
} from '@aidream/db'
import {
  abortMultipart,
  BUCKET,
  deleteObject,
  deletePrefix,
  hlsPrefix,
  thumbPrefix,
} from '@aidream/storage'

export interface CleanupOrphansInput {
  readonly scope: 'staleUploads' | 'orphanAssets' | 'failedOriginals'
  readonly now: Date
}

export interface CleanupResult {
  readonly examined: number
  readonly deleted: number
}

export interface CleanupDependencies {
  readonly expiredUploads: (now: Date) => Promise<UploadSession[]>
  readonly assets: (
    status: 'READY' | 'FAILED',
    before: Date,
    orphanOnly: boolean,
  ) => Promise<VideoAsset[]>
  readonly abort: (key: string, uploadId: string) => Promise<void>
  readonly abortSession: (id: string) => Promise<void>
  readonly deleteOriginal: (key: string) => Promise<void>
  readonly deleteHls: (assetId: string) => Promise<void>
  readonly deleteThumbs: (assetId: string) => Promise<void>
  readonly deleteAsset: (assetId: string) => Promise<void>
}

export function cleanupOrphans(
  input: CleanupOrphansInput,
  dependencies: CleanupDependencies = PRODUCTION_DEPENDENCIES,
): Promise<CleanupResult> {
  return runCleanup(input, dependencies)
}

async function runCleanup(
  input: CleanupOrphansInput,
  dependencies: CleanupDependencies,
): Promise<CleanupResult> {
  if (input.scope === 'staleUploads') {
    const uploads = await dependencies.expiredUploads(input.now)
    for (const upload of uploads) {
      if (upload.s3UploadId !== null) {
        await dependencies.abort(upload.objectKey, upload.s3UploadId)
      }
      await dependencies.abortSession(upload.id)
    }
    return { examined: uploads.length, deleted: uploads.length }
  }

  const retentionDays = input.scope === 'orphanAssets' ? 7 : 30
  const before = new Date(
    input.now.getTime() - retentionDays * 24 * 60 * 60 * 1000,
  )
  const assets = await dependencies.assets(
    input.scope === 'orphanAssets' ? 'READY' : 'FAILED',
    before,
    input.scope === 'orphanAssets',
  )
  for (const asset of assets) {
    await dependencies.deleteOriginal(asset.originalKey)
    if (input.scope === 'orphanAssets') {
      await dependencies.deleteHls(asset.id)
      await dependencies.deleteThumbs(asset.id)
      await dependencies.deleteAsset(asset.id)
    }
  }
  return { examined: assets.length, deleted: assets.length }
}

const PRODUCTION_DEPENDENCIES: CleanupDependencies = {
  expiredUploads: (now) => listExpiredUploadSessions(now, 1000),
  assets: (status, before, orphanOnly) =>
    listAssetsForCleanup(status, before, orphanOnly, 1000),
  abort: (key, uploadId) => abortMultipart(BUCKET.ORIGINALS, key, uploadId),
  abortSession: async (id) => {
    await updateUploadStatus(id, 'ABORTED', { s3UploadId: null })
  },
  deleteOriginal: (key) => deleteObject(BUCKET.ORIGINALS, key),
  deleteHls: async (assetId) => {
    await deletePrefix(BUCKET.HLS, hlsPrefix(assetId))
  },
  deleteThumbs: async (assetId) => {
    await deletePrefix(BUCKET.THUMBS, thumbPrefix(assetId))
  },
  deleteAsset: deleteAssetById,
}
