import type { UploadSession, VideoAsset } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import { cleanupOrphans, type CleanupDependencies } from './cleanup-orphans.js'
import { purgeDatabase } from './db-purge.js'
import { recoverStuck } from './recover-stuck.js'

const NOW = new Date('2026-08-24T00:00:00.000Z')

function cleanupDependencies(): CleanupDependencies {
  return {
    expiredUploads: vi.fn().mockResolvedValue([]),
    assets: vi.fn().mockResolvedValue([]),
    abort: vi.fn().mockResolvedValue(undefined),
    abortSession: vi.fn().mockResolvedValue(undefined),
    deleteOriginal: vi.fn().mockResolvedValue(undefined),
    deleteHls: vi.fn().mockResolvedValue(undefined),
    deleteThumbs: vi.fn().mockResolvedValue(undefined),
    deleteAsset: vi.fn().mockResolvedValue(undefined),
  }
}

describe('cleanupOrphans', () => {
  it('만료 멀티파트를 abort한 뒤 세션을 ABORTED로 만든다', async () => {
    const dependencies = cleanupDependencies()
    const upload = {
      id: 'upload_1',
      objectKey: 'originals/u/1/a.mp4',
      s3UploadId: 'multipart_1',
    } as UploadSession
    vi.mocked(dependencies.expiredUploads).mockResolvedValue([upload])

    await expect(
      cleanupOrphans({ scope: 'staleUploads', now: NOW }, dependencies),
    ).resolves.toEqual({ examined: 1, deleted: 1 })
    expect(dependencies.abort).toHaveBeenCalledWith(
      upload.objectKey,
      upload.s3UploadId,
    )
    expect(dependencies.abortSession).toHaveBeenCalledWith(upload.id)
  })

  it('7일 고아 자산의 모든 저장소와 DB 행을 지운다', async () => {
    const dependencies = cleanupDependencies()
    const asset = {
      id: 'asset_1',
      originalKey: 'originals/u/1/a.mp4',
    } as VideoAsset
    vi.mocked(dependencies.assets).mockResolvedValue([asset])

    await cleanupOrphans({ scope: 'orphanAssets', now: NOW }, dependencies)
    expect(dependencies.deleteOriginal).toHaveBeenCalledWith(asset.originalKey)
    expect(dependencies.deleteHls).toHaveBeenCalledWith(asset.id)
    expect(dependencies.deleteThumbs).toHaveBeenCalledWith(asset.id)
    expect(dependencies.deleteAsset).toHaveBeenCalledWith(asset.id)
  })
})

describe('recoverStuck', () => {
  it('기준 시각 이전 PENDING 자산을 같은 id로 재발행한다', async () => {
    const findStuck = vi.fn().mockResolvedValue([{ id: 'asset_1' }])
    const enqueueAsset = vi.fn().mockResolvedValue(undefined)

    await expect(
      recoverStuck(10, NOW, { findStuck, enqueueAsset }),
    ).resolves.toBe(1)
    expect(findStuck).toHaveBeenCalledWith(new Date('2026-08-23T23:50:00.000Z'))
    expect(enqueueAsset).toHaveBeenCalledWith('asset_1')
  })

  it('0분 기준을 거부한다', async () => {
    await expect(
      recoverStuck(0, NOW, {
        findStuck: vi.fn(),
        enqueueAsset: vi.fn(),
      }),
    ).rejects.toEqual(expect.objectContaining({ code: 'E_VALIDATION' }))
  })
})

describe('purgeDatabase', () => {
  it('기본 1000건 상한과 DRY_RUN을 저장소에 전달한다', async () => {
    const purge = vi.fn().mockResolvedValue({ candidates: 1200, deleted: 0 })
    await expect(
      purgeDatabase({ dryRun: true, now: NOW }, { purge }),
    ).resolves.toEqual({ candidates: 1200, deleted: 0 })
    expect(purge).toHaveBeenCalledWith({ now: NOW, dryRun: true, limit: 1000 })
  })

  it('1000건 초과 상한을 거부한다', () => {
    expect(() =>
      purgeDatabase(
        { dryRun: false, now: NOW, limit: 1001 },
        { purge: vi.fn() },
      ),
    ).toThrow()
  })
})
