import type {
  Rendition as PrismaRendition,
  VideoAsset as PrismaVideoAsset,
} from '@prisma/client'
import type { Rendition, VideoAsset } from '@aidream/core'

export function mapVideoAsset(row: PrismaVideoAsset): VideoAsset {
  return {
    id: row.id,
    uploadId: row.uploadId,
    status: row.status,
    originalKey: row.originalKey,
    hlsPrefix: row.hlsPrefix,
    masterPath: row.masterPath,
    posterKey: row.posterKey,
    durationSec: row.durationSec,
    width: row.width,
    height: row.height,
    videoCodec: row.videoCodec,
    audioCodec: row.audioCodec,
    bitrateKbps: row.bitrateKbps,
    sizeBytes: row.sizeBytes?.toString() ?? null,
    attemptCount: row.attemptCount,
    errorCode: row.errorCode,
    errorDetail: row.errorDetail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    readyAt: row.readyAt,
  }
}

export function mapRendition(row: PrismaRendition): Rendition {
  return {
    id: row.id,
    assetId: row.assetId,
    name: row.name,
    width: row.width,
    height: row.height,
    bitrateKbps: row.bitrateKbps,
    playlistPath: row.playlistPath,
    sizeBytes: row.sizeBytes.toString(),
    createdAt: row.createdAt,
  }
}
