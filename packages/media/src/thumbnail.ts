import { AppError } from '@aidream/core'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { buildSpriteArgs, buildThumbArgs } from './ffmpeg-args.js'

export interface ThumbnailOptions {
  readonly inputPath: string
  readonly outDir: string
  readonly durationSec: number
  readonly makeSprite: boolean
  readonly ffmpegPath?: string
  readonly timeoutMs?: number
  readonly signal?: AbortSignal
}

export interface ThumbnailResult {
  readonly thumbJpegPath: string
  readonly thumbWebpPath: string
  readonly posterPath: string
  readonly spritePath: string | null
  readonly spriteVttPath: string | null
}

export function makeThumbnails(
  options: ThumbnailOptions,
): Promise<ThumbnailResult> {
  return createThumbnails(options)
}

function timestamp(seconds: number): string {
  const milliseconds = Math.max(0, Math.round(seconds * 1000))
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000)
  const secs = Math.floor((milliseconds % 60_000) / 1000)
  const millis = milliseconds % 1000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

function spriteVtt(durationSec: number): string {
  const frameCount = Math.max(1, Math.ceil(durationSec / 10))
  const cues = Array.from({ length: frameCount }, (_, index) => {
    const start = index * 10
    const end = Math.min(durationSec, start + 10)
    const x = (index % 10) * 160
    const y = Math.floor(index / 10) * 90
    return `${timestamp(start)} --> ${timestamp(end)}\nsprite.jpg#xywh=${String(x)},${String(y)},160,90`
  })
  return `WEBVTT\n\n${cues.join('\n\n')}\n`
}

async function runFfmpeg(
  args: readonly string[],
  options: ThumbnailOptions,
): Promise<void> {
  const child = spawn(
    options.ffmpegPath ?? process.env.FFMPEG_PATH ?? 'ffmpeg',
    [...args],
    {
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  )
  let stderr = ''
  child.stderr.on('data', (chunk: Buffer) => {
    stderr = `${stderr}${chunk.toString('utf8')}`.slice(-16_384)
  })
  let killTimeout: NodeJS.Timeout | undefined
  const terminate = (): void => {
    child.kill('SIGTERM')
    killTimeout ??= setTimeout(() => child.kill('SIGKILL'), 5_000)
    killTimeout.unref()
  }
  const timeout = setTimeout(terminate, options.timeoutMs ?? 600_000)
  timeout.unref()
  options.signal?.addEventListener('abort', terminate, { once: true })
  try {
    const code = await new Promise<number | null>((resolve, reject) => {
      child.once('error', reject)
      child.once('close', resolve)
    })
    if (code !== 0) {
      throw new AppError(
        'E_MEDIA_TRANSCODE_FAILED',
        { stage: 'thumbnail' },
        new Error(stderr),
      )
    }
  } catch (error: unknown) {
    if (error instanceof AppError) throw error
    throw new AppError('E_MEDIA_TRANSCODE_FAILED', undefined, error)
  } finally {
    clearTimeout(timeout)
    if (killTimeout !== undefined) clearTimeout(killTimeout)
    options.signal?.removeEventListener('abort', terminate)
  }
}

async function createThumbnails(
  options: ThumbnailOptions,
): Promise<ThumbnailResult> {
  if (!Number.isFinite(options.durationSec) || options.durationSec <= 0) {
    throw new AppError('E_MEDIA_PROBE_FAILED', {
      reason: 'invalid-thumbnail-duration',
    })
  }
  await mkdir(options.outDir, { recursive: true })
  const atSec = options.durationSec * 0.1
  const thumbJpegPath = join(options.outDir, 'thumb.jpg')
  const thumbWebpPath = join(options.outDir, 'thumb.webp')
  const posterPath = join(options.outDir, 'poster.jpg')
  await runFfmpeg(
    buildThumbArgs(options.inputPath, atSec, thumbJpegPath),
    options,
  )
  await runFfmpeg(
    buildThumbArgs(options.inputPath, atSec, thumbWebpPath),
    options,
  )
  await runFfmpeg(
    [
      '-hide_banner',
      '-nostdin',
      '-y',
      '-ss',
      String(atSec),
      '-i',
      options.inputPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=800:1200:force_original_aspect_ratio=increase,crop=800:1200',
      '-q:v',
      '2',
      posterPath,
    ],
    options,
  )

  if (!options.makeSprite) {
    return {
      thumbJpegPath,
      thumbWebpPath,
      posterPath,
      spritePath: null,
      spriteVttPath: null,
    }
  }

  const spritePath = join(options.outDir, 'sprite.jpg')
  const spriteVttPath = join(options.outDir, 'sprite.vtt')
  await runFfmpeg(
    buildSpriteArgs(options.inputPath, options.durationSec, spritePath),
    options,
  )
  await writeFile(spriteVttPath, spriteVtt(options.durationSec), 'utf8')
  return {
    thumbJpegPath,
    thumbWebpPath,
    posterPath,
    spritePath,
    spriteVttPath,
  }
}
