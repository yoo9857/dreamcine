import {
  AppError,
  CAPACITY_TIERS,
  type UploadSession,
  type VideoAsset,
} from '@aidream/core'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  processTranscodeJob,
  type TranscodeJobDependencies,
} from './transcode.js'

const NOW = new Date('2026-08-24T00:00:00.000Z')
const ASSET: VideoAsset = {
  id: 'asset_1',
  uploadId: 'upload_1',
  status: 'PENDING',
  originalKey: 'originals/user_1/upload_1/video.mp4',
  hlsPrefix: null,
  masterPath: null,
  posterKey: null,
  durationSec: null,
  width: null,
  height: null,
  videoCodec: null,
  audioCodec: null,
  bitrateKbps: null,
  sizeBytes: '1000',
  attemptCount: 0,
  errorCode: null,
  errorDetail: null,
  createdAt: NOW,
  updatedAt: NOW,
  readyAt: null,
}
const UPLOAD: UploadSession = {
  id: 'upload_1',
  userId: 'user_1',
  status: 'UPLOADED',
  fileName: 'video.mp4',
  fileSize: '1000',
  mimeType: 'video/mp4',
  checksum: null,
  objectKey: ASSET.originalKey,
  s3UploadId: 'multipart_1',
  partSize: 1000,
  totalParts: 1,
  completedParts: [],
  errorCode: null,
  expiresAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
}

async function dependencies(asset: VideoAsset | null = ASSET) {
  const root = await mkdtemp(join(tmpdir(), 'aidream-job-test-'))
  const upload = vi.fn<TranscodeJobDependencies['upload']>().mockResolvedValue()
  const fail = vi
    .fn<TranscodeJobDependencies['fail']>()
    .mockImplementation((input) =>
      Promise.resolve({
        ...ASSET,
        status: 'FAILED',
        errorCode: input.errorCode,
        attemptCount: ASSET.attemptCount + 1,
      }),
    )
  const finalize = vi
    .fn<TranscodeJobDependencies['finalize']>()
    .mockResolvedValue({ ...ASSET, status: 'READY', readyAt: NOW })
  const workspaceCalls = vi.fn<(assetId: string) => void>()
  const workspace: TranscodeJobDependencies['workspace'] = async <T>(
    assetId: string,
    operation: (dir: string) => Promise<T>,
  ): Promise<T> => {
    workspaceCalls(assetId)
    return operation(root)
  }
  const transcode = vi
    .fn<TranscodeJobDependencies['transcode']>()
    .mockImplementation(
      async (_inputPath, outDir, _probe, _signal, onProgress) => {
        const specs = [
          {
            name: '720p',
            width: 1280,
            height: 720,
            videoBitrateKbps: 2800,
            audioBitrateKbps: 128,
          },
          {
            name: '360p',
            width: 640,
            height: 360,
            videoBitrateKbps: 800,
            audioBitrateKbps: 96,
          },
        ] as const
        await mkdir(outDir, { recursive: true })
        const renditions = []
        for (const spec of specs) {
          const dir = join(outDir, spec.name)
          await mkdir(dir)
          const playlistPath = join(dir, 'index.m3u8')
          await writeFile(playlistPath, '#EXTM3U')
          await writeFile(join(dir, 'seg_00001.ts'), 'segment')
          renditions.push({ spec, playlistPath, sizeBytes: 14 })
        }
        const masterPath = join(outDir, 'master.m3u8')
        await writeFile(masterPath, '#EXTM3U')
        onProgress(50)
        return { renditions, masterPath, totalBytes: 35 }
      },
    )
  const reporter = {
    report: vi.fn<(percent: number) => Promise<void>>().mockResolvedValue(),
    complete: vi.fn<() => Promise<void>>().mockResolvedValue(),
  }
  const probe = vi.fn<TranscodeJobDependencies['probe']>().mockResolvedValue({
    durationSec: 10,
    width: 1280,
    height: 720,
    videoCodec: 'h264',
    audioCodec: 'aac',
    bitrateKbps: 3000,
    frameRate: 24,
    hasAudio: true,
    rotation: 0,
  })
  const thumbnails = vi
    .fn<TranscodeJobDependencies['thumbnails']>()
    .mockImplementation(async (_input, outDir) => {
      await mkdir(outDir, { recursive: true })
      return {
        thumbJpegPath: join(outDir, 'thumb.jpg'),
        thumbWebpPath: join(outDir, 'thumb.webp'),
        posterPath: join(outDir, 'poster.jpg'),
        spritePath: null,
        spriteVttPath: null,
      }
    })
  const deps: TranscodeJobDependencies = {
    capacity: CAPACITY_TIERS.T0,
    now: () => NOW,
    findAsset: vi.fn().mockResolvedValue(asset),
    findUpload: vi.fn().mockResolvedValue(UPLOAD),
    updateStatus: vi
      .fn<TranscodeJobDependencies['updateStatus']>()
      .mockImplementation((_id, status) =>
        Promise.resolve({ ...ASSET, status }),
      ),
    fail,
    finalize,
    workspace,
    checkDisk: vi.fn().mockResolvedValue(undefined),
    downloadOriginal: vi.fn().mockResolvedValue(undefined),
    probe,
    transcode,
    thumbnails,
    upload,
    progress: vi.fn().mockResolvedValue(reporter),
    onProgressError: vi.fn(),
  }
  return {
    deps,
    fail,
    finalize,
    probe,
    reporter,
    transcode,
    upload,
    workspaceCalls,
  }
}

describe('processTranscodeJob', () => {
  it('산출물을 master가 마지막인 순서로 올리고 READY를 확정한다', async () => {
    const { deps, finalize, reporter, upload } = await dependencies()

    await expect(
      processTranscodeJob({ assetId: ASSET.id }, deps),
    ).resolves.toBe('COMPLETED')
    const keys = upload.mock.calls.map((call) => call[1])
    expect(keys.slice(-3)).toEqual([
      'hls/asset_1/720p/index.m3u8',
      'hls/asset_1/360p/index.m3u8',
      'hls/asset_1/master.m3u8',
    ])
    expect(keys.indexOf('hls/asset_1/720p/seg_00001.ts')).toBeLessThan(
      keys.indexOf('hls/asset_1/720p/index.m3u8'),
    )
    expect(finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'asset_1',
        userId: 'user_1',
        masterPath: 'hls/asset_1/master.m3u8',
      }),
    )
    expect(reporter.complete).toHaveBeenCalledOnce()
  })

  it.each([null, { ...ASSET, status: 'READY' as const }])(
    '삭제되었거나 READY인 자산을 부작용 없이 스킵한다',
    async (asset) => {
      const { deps, workspaceCalls } = await dependencies(asset)
      await expect(
        processTranscodeJob({ assetId: ASSET.id }, deps),
      ).resolves.toBe('SKIPPED')
      expect(workspaceCalls).not.toHaveBeenCalled()
    },
  )

  it('정책 위반은 한 번에 FAILED로 확정한다', async () => {
    const { deps, fail, probe } = await dependencies()
    probe.mockResolvedValue({
      durationSec: 10,
      width: 1280,
      height: 720,
      videoCodec: 'h264',
      audioCodec: null,
      bitrateKbps: 3000,
      frameRate: 24,
      hasAudio: false,
      rotation: 0,
    })

    await expect(
      processTranscodeJob({ assetId: ASSET.id }, deps),
    ).resolves.toBe('COMPLETED')
    expect(fail).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'E_MEDIA_NO_AUDIO_STREAM',
        retryable: false,
      }),
    )
  })

  it('재시도 가능 실패가 3회 미만이면 잡을 다시 실패시킨다', async () => {
    const { deps, transcode } = await dependencies()
    transcode.mockRejectedValue(new AppError('E_MEDIA_TRANSCODE_TIMEOUT'))

    await expect(
      processTranscodeJob({ assetId: ASSET.id }, deps),
    ).rejects.toEqual(
      expect.objectContaining({ code: 'E_MEDIA_TRANSCODE_TIMEOUT' }),
    )
  })

  it('세 번째 실패는 큐 재시도를 끝낸다', async () => {
    const exhausted = { ...ASSET, attemptCount: 2 }
    const { deps, fail, transcode } = await dependencies(exhausted)
    fail.mockResolvedValue({ ...exhausted, status: 'FAILED', attemptCount: 3 })
    transcode.mockRejectedValue(new AppError('E_MEDIA_TRANSCODE_FAILED'))

    await expect(
      processTranscodeJob({ assetId: ASSET.id }, deps),
    ).resolves.toBe('COMPLETED')
  })

  it('안전한 정수가 아닌 원본 크기는 검증 실패로 확정한다', async () => {
    const invalid = { ...ASSET, sizeBytes: 'not-a-number' }
    const { deps, fail } = await dependencies(invalid)

    await expect(
      processTranscodeJob({ assetId: ASSET.id }, deps),
    ).resolves.toBe('COMPLETED')
    expect(fail).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'E_VALIDATION', retryable: false }),
    )
  })

  it('알 수 없는 실행 오류는 트랜스코드 실패로 감싸 재시도한다', async () => {
    const { deps, fail, transcode } = await dependencies()
    transcode.mockRejectedValue(new Error('encoder crashed'))

    await expect(
      processTranscodeJob({ assetId: ASSET.id }, deps),
    ).rejects.toEqual(
      expect.objectContaining({ code: 'E_MEDIA_TRANSCODE_FAILED' }),
    )
    expect(fail).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'E_MEDIA_TRANSCODE_FAILED',
        retryable: true,
      }),
    )
  })

  it('실패 자산을 재시도할 때 PENDING으로 되돌리고 업로드 세션 없이 처리한다', async () => {
    const retrying = {
      ...ASSET,
      uploadId: null,
      status: 'FAILED' as const,
      attemptCount: 1,
    }
    const { deps } = await dependencies(retrying)

    await expect(
      processTranscodeJob({ assetId: ASSET.id }, deps),
    ).resolves.toBe('COMPLETED')
    expect(deps.findUpload).not.toHaveBeenCalled()
    expect(deps.updateStatus).toHaveBeenNthCalledWith(1, ASSET.id, 'PENDING')
    expect(deps.updateStatus).toHaveBeenNthCalledWith(2, ASSET.id, 'PROBING')
  })

  it('중간 진행률 저장 실패는 기록하고 트랜스코딩을 계속한다', async () => {
    const { deps, reporter } = await dependencies()
    const redisError = new Error('redis down')
    reporter.report.mockImplementation((percent) =>
      percent === 50 ? Promise.reject(redisError) : Promise.resolve(),
    )

    await expect(
      processTranscodeJob({ assetId: ASSET.id }, deps),
    ).resolves.toBe('COMPLETED')
    expect(deps.onProgressError).toHaveBeenCalledWith(redisError, ASSET.id)
  })
})
