import { AppError } from '@aidream/core'
import { spawn } from 'node:child_process'
import type { Readable } from 'node:stream'
import { z } from 'zod'

export interface ProbeResult {
  readonly durationSec: number
  readonly width: number
  readonly height: number
  readonly videoCodec: string
  readonly audioCodec: string | null
  readonly bitrateKbps: number
  readonly frameRate: number
  readonly hasAudio: boolean
  readonly rotation: number
}

export interface ProbeOptions {
  readonly ffprobePath?: string
  readonly signal?: AbortSignal
}

export function probe(
  filePath: string,
  options: ProbeOptions = {},
): Promise<ProbeResult> {
  return runProbe(filePath, options)
}

const NumberLikeSchema = z
  .union([z.string(), z.number()])
  .transform((value) => Number(value))
  .refine(Number.isFinite)

const ProbeOutputSchema = z.object({
  streams: z
    .array(
      z.object({
        codec_type: z.string().optional(),
        codec_name: z.string().optional(),
        width: z.number().int().nonnegative().optional(),
        height: z.number().int().nonnegative().optional(),
        avg_frame_rate: z.string().optional(),
        r_frame_rate: z.string().optional(),
        bit_rate: NumberLikeSchema.optional(),
        tags: z.object({ rotate: NumberLikeSchema.optional() }).optional(),
        side_data_list: z
          .array(z.object({ rotation: NumberLikeSchema.optional() }))
          .optional(),
      }),
    )
    .default([]),
  format: z
    .object({
      duration: NumberLikeSchema.optional(),
      bit_rate: NumberLikeSchema.optional(),
    })
    .default({}),
})

function frameRate(value: string | undefined): number {
  if (value === undefined || value === '') return 0
  const [numeratorRaw, denominatorRaw = '1'] = value.split('/')
  const numerator = Number(numeratorRaw)
  const denominator = Number(denominatorRaw)
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return 0
  }
  return numerator / denominator
}

function rotationOf(
  stream: z.infer<typeof ProbeOutputSchema>['streams'][number],
): number {
  const sideDataRotation = stream.side_data_list?.find(
    (entry) => entry.rotation !== undefined,
  )?.rotation
  const raw = sideDataRotation ?? stream.tags?.rotate ?? 0
  const normalized = ((Math.round(raw) % 360) + 360) % 360
  if (![0, 90, 180, 270].includes(normalized)) {
    throw new AppError('E_MEDIA_PROBE_FAILED', {
      reason: 'invalid-rotation-metadata',
    })
  }
  return normalized
}

async function collect(stream: Readable): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
  }
  return Buffer.concat(chunks).toString('utf8')
}

function exitCode(child: ReturnType<typeof spawn>): Promise<number | null> {
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', resolve)
  })
}

async function runProbe(
  filePath: string,
  options: ProbeOptions,
): Promise<ProbeResult> {
  try {
    const child = spawn(
      options.ffprobePath ?? process.env.FFPROBE_PATH ?? 'ffprobe',
      [
        '-v',
        'error',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        filePath,
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      },
    )
    const [stdout, , code] = await Promise.all([
      collect(child.stdout),
      collect(child.stderr),
      exitCode(child),
    ])
    if (code !== 0) {
      throw new AppError('E_MEDIA_PROBE_FAILED')
    }

    const parsed = ProbeOutputSchema.parse(JSON.parse(stdout) as unknown)
    const video = parsed.streams.find((stream) => stream.codec_type === 'video')
    const audio = parsed.streams.find((stream) => stream.codec_type === 'audio')
    const rotation = video === undefined ? 0 : rotationOf(video)
    const codedWidth = video?.width ?? 0
    const codedHeight = video?.height ?? 0
    const swapsDimensions = rotation === 90 || rotation === 270

    return {
      durationSec: parsed.format.duration ?? 0,
      width: swapsDimensions ? codedHeight : codedWidth,
      height: swapsDimensions ? codedWidth : codedHeight,
      videoCodec: video?.codec_name ?? '',
      audioCodec: audio?.codec_name ?? null,
      bitrateKbps: Math.round(
        (parsed.format.bit_rate ?? video?.bit_rate ?? 0) / 1000,
      ),
      frameRate: frameRate(video?.avg_frame_rate ?? video?.r_frame_rate),
      hasAudio: audio !== undefined,
      rotation,
    }
  } catch (error: unknown) {
    if (error instanceof AppError) throw error
    throw new AppError('E_MEDIA_PROBE_FAILED', undefined, error)
  }
}
