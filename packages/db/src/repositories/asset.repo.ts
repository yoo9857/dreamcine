import type { AssetStatus, Rendition, VideoAsset } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

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

export function findAssetById(_id: string): Promise<VideoAsset | null> {
  throw new NotImplementedError('T02:findAssetById')
}

export function createAsset(_input: CreateAssetData): Promise<VideoAsset> {
  throw new NotImplementedError('T02:createAsset')
}

export function updateAssetStatus(
  _id: string,
  _status: AssetStatus,
  _patch?: AssetMetadataPatch,
): Promise<VideoAsset> {
  throw new NotImplementedError('T02:updateAssetStatus')
}

export function incrementAssetAttempt(_id: string): Promise<VideoAsset> {
  throw new NotImplementedError('T02:incrementAssetAttempt')
}

export function createRendition(
  _input: CreateRenditionData,
): Promise<Rendition> {
  throw new NotImplementedError('T02:createRendition')
}

export function listRenditionsByAsset(_assetId: string): Promise<Rendition[]> {
  throw new NotImplementedError('T02:listRenditionsByAsset')
}
