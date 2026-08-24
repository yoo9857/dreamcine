import type {
  AssetStatus,
  ErrorCode,
  Rendition,
  VideoAsset,
} from '@aidream/core'
import { NotImplementedError } from '@aidream/core'
import { db } from '../client.js'
import { executeDb } from '../errors.js'
import { mapRendition, mapVideoAsset } from '../mappers/asset.mapper.js'

export interface CreateAssetData {
  uploadId?: string | null
  originalKey: string
  /** 완료 시점에 S3 가 알려준 실제 크기. 신고값이 아니다. */
  sizeBytes?: bigint | null
}

export interface AssetMetadataPatch {
  hlsPrefix?: string | null
  masterPath?: string | null
  posterKey?: string | null
  durationSec?: number | null
  width?: number | null
  height?: number | null
  videoCodec?: string | null
  audioCodec?: string | null
  bitrateKbps?: number | null
  sizeBytes?: bigint | null
  errorCode?: string | null
  errorDetail?: string | null
  readyAt?: Date | null
}

export interface CreateRenditionData {
  assetId: string
  name: string
  width: number
  height: number
  bitrateKbps: number
  playlistPath: string
  sizeBytes: bigint
}

export interface FinalizeAssetData {
  readonly assetId: string
  readonly userId: string | null
  readonly hlsPrefix: string
  readonly masterPath: string
  readonly posterKey: string
  readonly durationSec: number
  readonly width: number
  readonly height: number
  readonly videoCodec: string
  readonly audioCodec: string | null
  readonly bitrateKbps: number
  readonly readyAt: Date
  readonly renditions: readonly Omit<CreateRenditionData, 'assetId'>[]
}

export interface FailAssetData {
  readonly assetId: string
  readonly userId: string | null
  readonly errorCode: ErrorCode
  readonly retryable: boolean
}

export interface AssetOwnershipRecord {
  readonly asset: VideoAsset
  readonly ownerId: string
  readonly episodeId: string | null
}

export function findAssetOwnership(
  _assetId: string,
): Promise<AssetOwnershipRecord | null> {
  throw new NotImplementedError('T08:findAssetOwnership')
}

export function findAssetById(id: string): Promise<VideoAsset | null> {
  return executeDb(async () => {
    const row = await db.videoAsset.findUnique({ where: { id } })
    return row === null ? null : mapVideoAsset(row)
  })
}

export function createAsset(input: CreateAssetData): Promise<VideoAsset> {
  return executeDb(async () =>
    mapVideoAsset(await db.videoAsset.create({ data: input })),
  )
}

export function updateAssetStatus(
  id: string,
  status: AssetStatus,
  patch: AssetMetadataPatch = {},
): Promise<VideoAsset> {
  return executeDb(async () =>
    mapVideoAsset(
      await db.videoAsset.update({
        where: { id },
        data: { status, ...patch },
      }),
    ),
  )
}

export function incrementAssetAttempt(id: string): Promise<VideoAsset> {
  return executeDb(async () =>
    mapVideoAsset(
      await db.videoAsset.update({
        where: { id },
        data: { attemptCount: { increment: 1 } },
      }),
    ),
  )
}

export function createRendition(
  input: CreateRenditionData,
): Promise<Rendition> {
  return executeDb(async () =>
    mapRendition(await db.rendition.create({ data: input })),
  )
}

export function listRenditionsByAsset(assetId: string): Promise<Rendition[]> {
  return executeDb(async () =>
    (
      await db.rendition.findMany({
        where: { assetId },
        orderBy: [{ height: 'asc' }, { bitrateKbps: 'asc' }],
      })
    ).map(mapRendition),
  )
}

/**
 * 업로드 세션에 연결된 자산을 찾는다.
 *
 * 완료 요청이 두 번 와도 자산이 하나여야 한다 — 두 번째 호출이 이것으로
 * 첫 결과를 찾아 같은 답을 돌려준다. (T05 §7 ★)
 */
export function findAssetByUploadId(
  uploadId: string,
): Promise<VideoAsset | null> {
  return executeDb(async () => {
    const row = await db.videoAsset.findUnique({ where: { uploadId } })
    return row === null ? null : mapVideoAsset(row)
  })
}

export function finalizeAsset(input: FinalizeAssetData): Promise<VideoAsset> {
  return executeDb(() =>
    db.$transaction(async (tx) => {
      await tx.rendition.createMany({
        data: input.renditions.map((rendition) => ({
          ...rendition,
          assetId: input.assetId,
        })),
        skipDuplicates: true,
      })
      const asset = await tx.videoAsset.update({
        where: { id: input.assetId },
        data: {
          status: 'READY',
          hlsPrefix: input.hlsPrefix,
          masterPath: input.masterPath,
          posterKey: input.posterKey,
          durationSec: input.durationSec,
          width: input.width,
          height: input.height,
          videoCodec: input.videoCodec,
          audioCodec: input.audioCodec,
          bitrateKbps: input.bitrateKbps,
          errorCode: null,
          errorDetail: null,
          readyAt: input.readyAt,
        },
      })
      if (input.userId !== null) {
        await tx.notification.create({
          data: {
            userId: input.userId,
            type: 'TRANSCODE_DONE',
            payload: { assetId: input.assetId },
          },
        })
      }
      return mapVideoAsset(asset)
    }),
  )
}

export function failAsset(input: FailAssetData): Promise<VideoAsset> {
  return executeDb(() =>
    db.$transaction(async (tx) => {
      const asset = await tx.videoAsset.update({
        where: { id: input.assetId },
        data: {
          status: 'FAILED',
          attemptCount: { increment: 1 },
          errorCode: input.errorCode,
          errorDetail: null,
        },
      })
      if (
        input.userId !== null &&
        (!input.retryable || asset.attemptCount >= 3)
      ) {
        await tx.notification.create({
          data: {
            userId: input.userId,
            type: 'TRANSCODE_FAILED',
            payload: { assetId: input.assetId, errorCode: input.errorCode },
          },
        })
      }
      return mapVideoAsset(asset)
    }),
  )
}

export function listAssetsForCleanup(
  status: AssetStatus,
  before: Date,
  orphanOnly: boolean,
  limit = 1000,
): Promise<VideoAsset[]> {
  return executeDb(async () =>
    (
      await db.videoAsset.findMany({
        where: {
          status,
          updatedAt: { lt: before },
          ...(orphanOnly ? { episode: { is: null } } : {}),
        },
        orderBy: { updatedAt: 'asc' },
        take: limit,
      })
    ).map(mapVideoAsset),
  )
}

export function deleteAssetById(assetId: string): Promise<void> {
  return executeDb(async () => {
    await db.videoAsset.delete({ where: { id: assetId } })
  })
}

export function listStuckPendingAssets(
  before: Date,
  limit = 1000,
): Promise<VideoAsset[]> {
  return executeDb(async () =>
    (
      await db.videoAsset.findMany({
        where: { status: 'PENDING', updatedAt: { lt: before } },
        orderBy: { updatedAt: 'asc' },
        take: limit,
      })
    ).map(mapVideoAsset),
  )
}
