import type { AssetStatus, Rendition, VideoAsset } from '@aidream/core'
import { db } from '../client.js'
import { executeDb } from '../errors.js'
import { mapRendition, mapVideoAsset } from '../mappers/asset.mapper.js'

export interface CreateAssetData {
  uploadId?: string | null
  originalKey: string
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
