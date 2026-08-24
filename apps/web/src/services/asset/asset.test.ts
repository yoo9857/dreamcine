import type { VideoAsset } from '@aidream/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'

const mocks = vi.hoisted(() => ({
  findAsset: vi.fn(),
  findUpload: vi.fn(),
  get: vi.fn(),
  listRenditions: vi.fn(),
  retryJob: vi.fn(),
  updateStatus: vi.fn(),
}))

vi.mock('@aidream/db', () => ({
  findAssetById: mocks.findAsset,
  findUploadSessionById: mocks.findUpload,
  listRenditionsByAsset: mocks.listRenditions,
  updateAssetStatus: mocks.updateStatus,
}))
vi.mock('@aidream/queue', () => ({
  QUEUE: { VIDEO_TRANSCODE: 'video.transcode' },
  retryJob: mocks.retryJob,
}))
vi.mock('@/src/lib/redis', () => ({ getRedis: () => ({ get: mocks.get }) }))

const { getAssetStatus } = await import('./get-asset-status.js')
const { retryAsset } = await import('./retry-asset.js')

const NOW = new Date('2026-08-24T00:00:00.000Z')
const SESSION: RouteSession = {
  userId: 'user_1',
  user: {
    id: 'user_1',
    handle: 'creator',
    email: 'creator@example.com',
    displayName: 'Creator',
    role: 'CREATOR',
    status: 'ACTIVE',
    emailVerified: true,
  },
  expiresAt: NOW,
}
const ASSET: VideoAsset = {
  id: 'asset_1',
  uploadId: 'upload_1',
  status: 'TRANSCODING',
  originalKey: 'originals/user_1/upload_1/video.mp4',
  hlsPrefix: null,
  masterPath: null,
  posterKey: null,
  durationSec: 10,
  width: 1280,
  height: 720,
  videoCodec: 'h264',
  audioCodec: 'aac',
  bitrateKbps: 3000,
  sizeBytes: '1000',
  attemptCount: 1,
  errorCode: null,
  errorDetail: null,
  createdAt: NOW,
  updatedAt: NOW,
  readyAt: null,
}

beforeEach(() => {
  mocks.findAsset.mockReset().mockResolvedValue(ASSET)
  mocks.findUpload.mockReset().mockResolvedValue({ userId: 'user_1' })
  mocks.listRenditions
    .mockReset()
    .mockResolvedValue([
      { name: '720p', width: 1280, height: 720, bitrateKbps: 2800 },
    ])
  mocks.get.mockReset().mockResolvedValue('45')
  mocks.retryJob.mockReset().mockResolvedValue(undefined)
  mocks.updateStatus.mockReset().mockResolvedValue({
    ...ASSET,
    status: 'PENDING',
  })
})

describe('getAssetStatus', () => {
  it('소유 자산의 진행률과 렌디션을 반환한다', async () => {
    await expect(getAssetStatus(SESSION, ASSET.id)).resolves.toMatchObject({
      id: ASSET.id,
      status: 'TRANSCODING',
      progress: 45,
      durationSec: 10,
      width: 1280,
      height: 720,
      renditions: [{ name: '720p', width: 1280, height: 720 }],
      attemptCount: 1,
    })
  })

  it('진행률은 0~100 범위로 제한하고 READY는 100이다', async () => {
    mocks.get.mockResolvedValue('150')
    await expect(getAssetStatus(SESSION, ASSET.id)).resolves.toMatchObject({
      progress: 100,
    })
    mocks.findAsset.mockResolvedValue({ ...ASSET, status: 'READY' })
    await expect(getAssetStatus(SESSION, ASSET.id)).resolves.toMatchObject({
      progress: 100,
    })
  })

  it('Redis 오류는 AppError일 때 진행률 0으로 폴백한다', async () => {
    const { AppError } = await import('@aidream/core')
    mocks.get.mockRejectedValue(new AppError('E_QUEUE_UNAVAILABLE'))
    await expect(getAssetStatus(SESSION, ASSET.id)).resolves.toMatchObject({
      progress: 0,
    })
  })

  it('없는 자산과 타인 자산을 거부한다', async () => {
    mocks.findAsset.mockResolvedValueOnce(null)
    await expect(getAssetStatus(SESSION, 'missing')).rejects.toMatchObject({
      code: 'E_ASSET_NOT_FOUND',
    })
    mocks.findUpload.mockResolvedValue({ userId: 'other' })
    await expect(getAssetStatus(SESSION, ASSET.id)).rejects.toMatchObject({
      code: 'E_PERM_NOT_OWNER',
    })
  })
})

describe('retryAsset', () => {
  it('3회 미만 실패 자산을 PENDING으로 바꾸고 같은 잡을 재시도한다', async () => {
    mocks.findAsset.mockResolvedValue({ ...ASSET, status: 'FAILED' })

    await expect(retryAsset(SESSION, ASSET.id)).resolves.toEqual({
      id: ASSET.id,
      status: 'PENDING',
    })
    expect(mocks.updateStatus).toHaveBeenCalledWith(ASSET.id, 'PENDING', {
      errorCode: null,
      errorDetail: null,
    })
    expect(mocks.retryJob).toHaveBeenCalledWith('video.transcode', ASSET.id, {
      assetId: ASSET.id,
    })
  })

  it('실패 상태가 아니거나 3회를 소진한 자산은 거부한다', async () => {
    await expect(retryAsset(SESSION, ASSET.id)).rejects.toMatchObject({
      code: 'E_ASSET_NOT_READY',
    })
    mocks.findAsset.mockResolvedValue({
      ...ASSET,
      status: 'FAILED',
      attemptCount: 3,
    })
    await expect(retryAsset(SESSION, ASSET.id)).rejects.toMatchObject({
      code: 'E_ASSET_NOT_READY',
    })
  })

  it('없는 자산과 타인 자산을 거부한다', async () => {
    mocks.findAsset.mockResolvedValueOnce(null)
    await expect(retryAsset(SESSION, 'missing')).rejects.toMatchObject({
      code: 'E_ASSET_NOT_FOUND',
    })
    mocks.findUpload.mockResolvedValue({ userId: 'other' })
    await expect(retryAsset(SESSION, ASSET.id)).rejects.toMatchObject({
      code: 'E_PERM_NOT_OWNER',
    })
  })
})
