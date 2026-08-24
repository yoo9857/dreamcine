import { AppError } from '@aidream/core'

import type { RenditionSpec } from './ladder.js'

export interface HlsArgsInput {
  readonly inputPath: string
  readonly outDir: string
  readonly ladder: readonly RenditionSpec[]
  readonly rotation: number
}

export function buildHlsArgs(input: HlsArgsInput): string[] {
  if (input.ladder.length === 0) {
    throw new AppError('E_MEDIA_RESOLUTION_TOO_LOW')
  }

  const rotationFilter: Record<number, string | null> = {
    0: null,
    90: 'transpose=clock',
    180: 'hflip,vflip',
    270: 'transpose=cclock',
  }
  const rotation = rotationFilter[input.rotation]
  if (rotation === undefined) {
    throw new AppError('E_MEDIA_PROBE_FAILED', {
      reason: 'invalid-rotation',
      rotation: input.rotation,
    })
  }

  const splitOutputs = input.ladder
    .map((_, index) => `[v${String(index)}]`)
    .join('')
  const filterParts: string[] = []
  const splitInput = rotation === null ? '[0:v]' : '[rotated]'
  if (rotation !== null) {
    filterParts.push(`[0:v]${rotation}[rotated]`)
  }
  filterParts.push(
    `${splitInput}split=${String(input.ladder.length)}${splitOutputs}`,
  )
  input.ladder.forEach((spec, index) => {
    const longSide = Math.max(spec.width, spec.height)
    const scale =
      `scale='if(gte(iw,ih),min(${String(longSide)},iw),-2)'` +
      `:'if(gte(iw,ih),-2,min(${String(longSide)},ih))'`
    filterParts.push(`[v${String(index)}]${scale}[v${String(index)}out]`)
  })

  const args = [
    '-hide_banner',
    '-nostdin',
    '-y',
    '-progress',
    'pipe:2',
    '-noautorotate',
    '-i',
    input.inputPath,
    '-filter_complex',
    filterParts.join(';'),
  ]

  input.ladder.forEach((spec, index) => {
    args.push(
      '-map',
      `[v${String(index)}out]`,
      `-c:v:${String(index)}`,
      'libx264',
      `-b:v:${String(index)}`,
      `${String(spec.videoBitrateKbps)}k`,
      `-maxrate:v:${String(index)}`,
      `${String(Math.round(spec.videoBitrateKbps * 1.1))}k`,
      `-bufsize:v:${String(index)}`,
      `${String(spec.videoBitrateKbps * 2)}k`,
    )
  })

  input.ladder.forEach((spec, index) => {
    args.push(
      '-map',
      '0:a:0',
      `-c:a:${String(index)}`,
      'aac',
      `-b:a:${String(index)}`,
      `${String(spec.audioBitrateKbps)}k`,
      `-ac:a:${String(index)}`,
      '2',
    )
  })

  const outputRoot = input.outDir.replaceAll('\\', '/').replace(/\/$/u, '')
  const streamMap = input.ladder
    .map(
      (spec, index) =>
        `v:${String(index)},a:${String(index)},name:${spec.name}`,
    )
    .join(' ')

  args.push(
    '-preset',
    'veryfast',
    '-profile:v',
    'main',
    '-level',
    '4.0',
    '-pix_fmt',
    'yuv420p',
    '-g',
    '48',
    '-keyint_min',
    '48',
    '-sc_threshold',
    '0',
    '-f',
    'hls',
    '-hls_time',
    '6',
    '-hls_playlist_type',
    'vod',
    '-hls_segment_type',
    'mpegts',
    '-hls_flags',
    'independent_segments',
    '-master_pl_name',
    'master.m3u8',
    '-var_stream_map',
    streamMap,
    '-hls_segment_filename',
    `${outputRoot}/%v/seg_%05d.ts`,
    `${outputRoot}/%v/index.m3u8`,
  )
  return args
}

export function buildThumbArgs(
  inputPath: string,
  atSec: number,
  outPath: string,
): string[] {
  if (!Number.isFinite(atSec) || atSec < 0) {
    throw new AppError('E_MEDIA_PROBE_FAILED', {
      reason: 'invalid-thumbnail-timestamp',
    })
  }
  return [
    '-hide_banner',
    '-nostdin',
    '-y',
    '-ss',
    String(atSec),
    '-i',
    inputPath,
    '-frames:v',
    '1',
    '-vf',
    'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720',
    '-q:v',
    '2',
    outPath,
  ]
}

export function buildSpriteArgs(
  inputPath: string,
  durationSec: number,
  outPath: string,
): string[] {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new AppError('E_MEDIA_PROBE_FAILED', {
      reason: 'invalid-sprite-duration',
    })
  }
  const frameCount = Math.max(1, Math.ceil(durationSec / 10))
  const columns = Math.min(10, frameCount)
  const rows = Math.ceil(frameCount / columns)
  return [
    '-hide_banner',
    '-nostdin',
    '-y',
    '-i',
    inputPath,
    '-vf',
    `select='isnan(prev_selected_t)+gte(t-prev_selected_t,10)',scale=160:90:force_original_aspect_ratio=increase,crop=160:90,tile=${String(columns)}x${String(rows)}:nb_frames=${String(frameCount)}`,
    '-frames:v',
    '1',
    '-q:v',
    '3',
    outPath,
  ]
}
