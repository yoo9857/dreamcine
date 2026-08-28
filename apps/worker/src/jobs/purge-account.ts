import { AppError } from '@aidream/core'
import {
  findAccountPurgeManifest,
  purgeAccountDatabase,
  type AccountPurgeManifest,
} from '@aidream/db'
import {
  abortMultipart,
  BUCKET,
  deleteObject,
  deletePrefix,
  hlsPrefix,
  thumbPrefix,
  type BucketKind,
} from '@aidream/storage'

export interface PurgeAccountDependencies {
  readonly manifest: (
    userId: string,
    now: Date,
  ) => Promise<AccountPurgeManifest | null>
  readonly abort: (key: string, uploadId: string) => Promise<void>
  readonly deleteObject: (bucket: BucketKind, key: string) => Promise<void>
  readonly deletePrefix: (
    bucket: BucketKind,
    prefix: string,
  ) => Promise<{
    readonly failed: readonly string[]
  }>
  readonly purgeDatabase: (manifest: AccountPurgeManifest) => Promise<void>
}

function bucketForKey(key: string): BucketKind {
  if (key.startsWith(`${BUCKET.ORIGINALS}/`)) return BUCKET.ORIGINALS
  if (key.startsWith(`${BUCKET.HLS}/`)) return BUCKET.HLS
  // 프로필·포스터의 초기 버전 키는 `avatars/...`, `posters/...`처럼
  // `thumbs/` 접두사 없이 저장되었다. 나머지 공개 이미지 키는 모두 thumbs 버킷이다.
  return BUCKET.THUMBS
}

export async function purgeAccount(
  userId: string,
  now = new Date(),
  dependencies: PurgeAccountDependencies = PRODUCTION_DEPENDENCIES,
): Promise<{ deleted: boolean; assets: number; objects: number }> {
  const manifest = await dependencies.manifest(userId, now)
  if (manifest === null) return { deleted: false, assets: 0, objects: 0 }

  for (const upload of manifest.multipartUploads) {
    await dependencies.abort(upload.objectKey, upload.s3UploadId)
  }

  const originals = await dependencies.deletePrefix(
    BUCKET.ORIGINALS,
    `${BUCKET.ORIGINALS}/${manifest.userId}/`,
  )
  if (originals.failed.length > 0) {
    throw new AppError('E_STORAGE_UNAVAILABLE', {
      reason: 'account-originals-partial-delete',
    })
  }

  for (const assetId of manifest.assetIds) {
    for (const [bucket, prefix] of [
      [BUCKET.HLS, hlsPrefix(assetId)],
      [BUCKET.THUMBS, thumbPrefix(assetId)],
    ] as const) {
      const result = await dependencies.deletePrefix(bucket, prefix)
      if (result.failed.length > 0) {
        throw new AppError('E_STORAGE_UNAVAILABLE', {
          reason: 'account-media-partial-delete',
        })
      }
    }
  }

  for (const key of manifest.objectKeys) {
    await dependencies.deleteObject(bucketForKey(key), key)
  }
  await dependencies.purgeDatabase(manifest)
  return {
    deleted: true,
    assets: manifest.assetIds.length,
    objects: manifest.objectKeys.length,
  }
}

const PRODUCTION_DEPENDENCIES: PurgeAccountDependencies = {
  manifest: findAccountPurgeManifest,
  abort: (key, uploadId) => abortMultipart(BUCKET.ORIGINALS, key, uploadId),
  deleteObject,
  deletePrefix,
  purgeDatabase: purgeAccountDatabase,
}
