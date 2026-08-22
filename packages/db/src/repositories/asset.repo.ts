import type { AssetStatus, Rendition, VideoAsset } from '@aidream/core'
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
