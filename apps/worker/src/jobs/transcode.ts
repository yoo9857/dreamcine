import {
  AppError,
  loadCapacity,
  loadServerEnv,
  type AssetStatus,
  type Capacity,
  type ErrorCode,
  type UploadSession,
  type VideoAsset,
} from '@aidream/core'
import {
  failAsset,
  finalizeAsset,
  findAssetById,
  findUploadSessionById,
  updateAssetStatus,
  type AssetMetadataPatch,
  type FailAssetData,
  type FinalizeAssetData,
} from '@aidream/db'
import {
  buildLadder,
  makeThumbnails,
  probe,
  transcodeToHls,
  validateProbe,
  type ProbeResult,
  type ThumbnailResult,
  type TranscodeResult,
} from '@aidream/media'
import { getQueue, QUEUE } from '@aidream/queue'
import {
  BUCKET,
  getObjectStream,
  hlsMasterKey,
  hlsPrefix,
  hlsRenditionKey,
  IMMUTABLE_1Y,
  putObject,
  thumbKey,
  type BucketKind,
} from '@aidream/storage'
import { createReadStream, createWriteStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import pino from 'pino'

import { checkDisk } from '../lib/disk.js'
import { idempotencyGate } from '../lib/idempotency.js'
import {
  createProgressReporter,
  type ProgressReporter,
} from '../lib/progress.js'
import { withWorkspace } from '../lib/workspace.js'

export interface TranscodeJobInput {
  readonly assetId: string
  readonly signal?: AbortSignal
}

export type TranscodeJobResult = 'COMPLETED' | 'SKIPPED'

export interface TranscodeJobDependencies {
  readonly capacity: Capacity
  readonly now: () => Date
  readonly findAsset: (assetId: string) => Promise<VideoAsset | null>
  readonly findUpload: (uploadId: string) => Promise<UploadSession | null>
  readonly updateStatus: (
    assetId: string,
    status: AssetStatus,
    patch?: AssetMetadataPatch,
  ) => Promise<VideoAsset>
  readonly fail: (input: FailAssetData) => Promise<VideoAsset>
  readonly finalize: (input: FinalizeAssetData) => Promise<VideoAsset>
  readonly workspace: <T>(
    assetId: string,
    operation: (dir: string) => Promise<T>,
  ) => Promise<T>
  readonly checkDisk: (directory: string, sizeBytes: number) => Promise<void>
  readonly downloadOriginal: (key: string, destination: string) => Promise<void>
  readonly probe: (path: string, signal?: AbortSignal) => Promise<ProbeResult>
  readonly transcode: (
    inputPath: string,
    outDir: string,
    probeResult: ProbeResult,
    signal: AbortSignal | undefined,
    onProgress: (percent: number) => void,
  ) => Promise<TranscodeResult>
  readonly thumbnails: (
    inputPath: string,
    outDir: string,
    probeResult: ProbeResult,
    signal?: AbortSignal,
  ) => Promise<ThumbnailResult>
  readonly upload: (
    bucket: BucketKind,
    key: string,
    path: string,
    contentType: string,
  ) => Promise<void>
  readonly progress: (assetId: string) => Promise<ProgressReporter>
  readonly onProgressError: (error: unknown, assetId: string) => void
}

export function processTranscodeJob(
  input: TranscodeJobInput,
  dependencies?: TranscodeJobDependencies,
): Promise<TranscodeJobResult> {
  return runTranscodeJob(input, dependencies ?? productionDependencies())
}

const RETRYABLE_CODES = new Set<ErrorCode>([
  'E_MEDIA_DISK_FULL',
  'E_MEDIA_TRANSCODE_FAILED',
  'E_MEDIA_TRANSCODE_TIMEOUT',
  'E_STORAGE_UNAVAILABLE',
  'E_DB_UNAVAILABLE',
  'E_QUEUE_UNAVAILABLE',
])

function safeSize(asset: VideoAsset): number {
  const size = Number(asset.sizeBytes)
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new AppError('E_VALIDATION', { field: 'asset.sizeBytes' })
  }
  return size
}

async function uploadArtifacts(
  assetId: string,
  hls: TranscodeResult,
  thumbs: ThumbnailResult,
  dependencies: TranscodeJobDependencies,
): Promise<void> {
  const thumbFiles = [
    thumbs.thumbJpegPath,
    thumbs.thumbWebpPath,
    thumbs.posterPath,
    thumbs.spritePath,
    thumbs.spriteVttPath,
  ].filter((path): path is string => path !== null)
  for (const path of thumbFiles) {
    const name = basename(path)
    const contentType = name.endsWith('.webp')
      ? 'image/webp'
      : name.endsWith('.vtt')
        ? 'text/vtt'
        : 'image/jpeg'
    await dependencies.upload(
      BUCKET.THUMBS,
      thumbKey(assetId, name),
      path,
      contentType,
    )
  }

  for (const rendition of hls.renditions) {
    const directory = join(rendition.playlistPath, '..')
    const files = (await readdir(directory))
      .filter((name) => name.endsWith('.ts'))
      .sort()
    for (const name of files) {
      await dependencies.upload(
        BUCKET.HLS,
        hlsRenditionKey(assetId, rendition.spec.name, name),
        join(directory, name),
        'video/mp2t',
      )
    }
  }
  for (const rendition of hls.renditions) {
    await dependencies.upload(
      BUCKET.HLS,
      hlsRenditionKey(assetId, rendition.spec.name, 'index.m3u8'),
      rendition.playlistPath,
      'application/vnd.apple.mpegurl',
    )
  }
  await dependencies.upload(
    BUCKET.HLS,
    hlsMasterKey(assetId),
    hls.masterPath,
    'application/vnd.apple.mpegurl',
  )
}

async function runTranscodeJob(
  input: TranscodeJobInput,
  dependencies: TranscodeJobDependencies,
): Promise<TranscodeJobResult> {
  const foundAsset = await dependencies.findAsset(input.assetId)
  const decision = idempotencyGate(foundAsset, dependencies.now())
  if (decision !== 'PROCESS' || foundAsset === null) return 'SKIPPED'
  let asset: VideoAsset = foundAsset
  const upload =
    asset.uploadId === null
      ? null
      : await dependencies.findUpload(asset.uploadId)
  const userId = upload?.userId ?? null

  try {
    const sizeBytes = safeSize(asset)
    await dependencies.workspace(asset.id, async (workspace) => {
      await dependencies.checkDisk(workspace, sizeBytes)
      const inputPath = join(workspace, 'input')
      await dependencies.downloadOriginal(asset.originalKey, inputPath)

      if (asset.status === 'FAILED') {
        asset = await dependencies.updateStatus(asset.id, 'PENDING')
      }
      if (asset.status === 'PENDING') {
        asset = await dependencies.updateStatus(asset.id, 'PROBING')
      }
      const probeResult = await dependencies.probe(inputPath, input.signal)
      validateProbe(probeResult, dependencies.capacity)
      if (asset.status !== 'TRANSCODING') {
        asset = await dependencies.updateStatus(asset.id, 'TRANSCODING')
      }

      const reporter = await dependencies.progress(asset.id)
      await reporter.report(0)
      let progressWrites = Promise.resolve()
      const hlsDir = join(workspace, 'hls')
      const hls = await dependencies.transcode(
        inputPath,
        hlsDir,
        probeResult,
        input.signal,
        (percent) => {
          progressWrites = progressWrites
            .then(() => reporter.report(percent))
            .catch((error: unknown) => {
              dependencies.onProgressError(error, asset.id)
            })
        },
      )
      await progressWrites
      const thumbs = await dependencies.thumbnails(
        inputPath,
        join(workspace, 'thumbs'),
        probeResult,
        input.signal,
      )
      await uploadArtifacts(asset.id, hls, thumbs, dependencies)
      await dependencies.finalize({
        assetId: asset.id,
        userId,
        hlsPrefix: hlsPrefix(asset.id),
        masterPath: hlsMasterKey(asset.id),
        posterKey: thumbKey(asset.id, 'poster.jpg'),
        durationSec: Math.round(probeResult.durationSec),
        width: probeResult.width,
        height: probeResult.height,
        videoCodec: probeResult.videoCodec,
        audioCodec: probeResult.audioCodec,
        bitrateKbps: probeResult.bitrateKbps,
        readyAt: dependencies.now(),
        renditions: hls.renditions.map((rendition) => ({
          name: rendition.spec.name,
          width: rendition.spec.width,
          height: rendition.spec.height,
          bitrateKbps: rendition.spec.videoBitrateKbps,
          playlistPath: hlsRenditionKey(
            asset.id,
            rendition.spec.name,
            'index.m3u8',
          ),
          sizeBytes: BigInt(rendition.sizeBytes),
        })),
      })
      await reporter.complete()
    })
    return 'COMPLETED'
  } catch (error: unknown) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError('E_MEDIA_TRANSCODE_FAILED', undefined, error)
    const retryable = RETRYABLE_CODES.has(appError.code)
    const failed = await dependencies.fail({
      assetId: asset.id,
      userId,
      errorCode: appError.code,
      retryable,
    })
    if (retryable && failed.attemptCount < 3) throw appError
    return 'COMPLETED'
  }
}

function productionDependencies(): TranscodeJobDependencies {
  const env = loadServerEnv()
  const capacity = loadCapacity(env.CAPACITY_TIER)
  const logger = pino({ level: env.LOG_LEVEL })
  return {
    capacity,
    now: () => new Date(),
    findAsset: findAssetById,
    findUpload: findUploadSessionById,
    updateStatus: updateAssetStatus,
    fail: failAsset,
    finalize: finalizeAsset,
    workspace: (assetId, operation) =>
      withWorkspace(assetId, operation, {
        rootDir: env.TMP_DIR,
        onCleanupError: (error) => {
          logger.error({ err: error, assetId }, 'workspace cleanup failed')
        },
      }),
    checkDisk,
    downloadOriginal: async (key, destination) => {
      const object = await getObjectStream(BUCKET.ORIGINALS, key)
      await pipeline(object.body, createWriteStream(destination))
    },
    probe: (path, signal) =>
      probe(path, {
        ffprobePath: env.FFPROBE_PATH,
        ...(signal === undefined ? {} : { signal }),
      }),
    transcode: (inputPath, outDir, probeResult, signal, onProgress) =>
      transcodeToHls(
        {
          inputPath,
          outDir,
          ladder: buildLadder(
            probeResult.width,
            probeResult.height,
            capacity.ladder,
          ),
          rotation: probeResult.rotation,
        },
        {
          durationSec: probeResult.durationSec,
          timeoutMs: Math.max(600_000, probeResult.durationSec * 4_000),
          ffmpegPath: env.FFMPEG_PATH,
          ...(signal === undefined ? {} : { signal }),
          onProgress,
        },
      ),
    thumbnails: (inputPath, outDir, probeResult, signal) =>
      makeThumbnails({
        inputPath,
        outDir,
        durationSec: probeResult.durationSec,
        makeSprite: capacity.ladder.some((name) => name === '1080p'),
        ffmpegPath: env.FFMPEG_PATH,
        ...(signal === undefined ? {} : { signal }),
      }),
    upload: async (bucket, key, path, contentType) => {
      const size = (await stat(path)).size
      await putObject({
        bucket,
        key,
        body: createReadStream(path),
        contentType,
        cacheControl: IMMUTABLE_1Y,
        contentLength: size,
      })
    },
    progress: async (assetId) => {
      const client = await getQueue(QUEUE.VIDEO_TRANSCODE).client
      return createProgressReporter(
        {
          set: (key, value, _mode, ttlSec) =>
            client.set(key, value, { EX: ttlSec }),
        },
        assetId,
      )
    },
    onProgressError: (error, assetId) => {
      logger.error({ err: error, assetId }, 'progress update failed')
    },
  }
}
