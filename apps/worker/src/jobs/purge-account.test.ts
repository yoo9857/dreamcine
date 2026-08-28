import type { AccountPurgeManifest } from '@aidream/db'
import { BUCKET } from '@aidream/storage'
import { describe, expect, it, vi } from 'vitest'

import { purgeAccount, type PurgeAccountDependencies } from './purge-account.js'

const NOW = new Date('2026-09-27T00:00:00.000Z')
const MANIFEST: AccountPurgeManifest = {
  userId: 'user_1',
  email: 'creator@example.com',
  assetIds: ['asset_1'],
  multipartUploads: [
    { objectKey: 'originals/user_1/upload_1/video.mp4', s3UploadId: 'mp_1' },
  ],
  objectKeys: [
    'originals/user_1/upload_1/video.mp4',
    'thumbs/avatars/user_1.webp',
  ],
}

function dependencies(): PurgeAccountDependencies {
  return {
    manifest: vi.fn().mockResolvedValue(MANIFEST),
    abort: vi.fn().mockResolvedValue(undefined),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    deletePrefix: vi.fn().mockResolvedValue({ failed: [] }),
    purgeDatabase: vi.fn().mockResolvedValue(undefined),
  }
}

describe('purgeAccount', () => {
  it('deletes storage before the database and is retry-safe', async () => {
    const deps = dependencies()
    await expect(purgeAccount(MANIFEST.userId, NOW, deps)).resolves.toEqual({
      deleted: true,
      assets: 1,
      objects: 2,
    })

    expect(deps.manifest).toHaveBeenCalledWith(MANIFEST.userId, NOW)
    expect(deps.abort).toHaveBeenCalledWith(
      MANIFEST.multipartUploads[0]?.objectKey,
      'mp_1',
    )
    expect(deps.deletePrefix).toHaveBeenCalledWith(
      BUCKET.ORIGINALS,
      'originals/user_1/',
    )
    expect(deps.deletePrefix).toHaveBeenCalledWith(BUCKET.HLS, 'hls/asset_1/')
    expect(deps.deletePrefix).toHaveBeenCalledWith(
      BUCKET.THUMBS,
      'thumbs/asset_1/',
    )
    expect(deps.purgeDatabase).toHaveBeenCalledWith(MANIFEST)
    expect(
      vi.mocked(deps.deleteObject).mock.invocationCallOrder.at(-1),
    ).toBeLessThan(
      vi.mocked(deps.purgeDatabase).mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('does not remove database rows when storage reports a partial failure', async () => {
    const deps = dependencies()
    vi.mocked(deps.deletePrefix).mockResolvedValueOnce({ failed: ['key'] })

    await expect(
      purgeAccount(MANIFEST.userId, NOW, deps),
    ).rejects.toMatchObject({
      code: 'E_STORAGE_UNAVAILABLE',
    })
    expect(deps.purgeDatabase).not.toHaveBeenCalled()
  })

  it('treats an already-purged account as success', async () => {
    const deps = dependencies()
    vi.mocked(deps.manifest).mockResolvedValue(null)
    await expect(purgeAccount('missing', NOW, deps)).resolves.toEqual({
      deleted: false,
      assets: 0,
      objects: 0,
    })
  })
})
