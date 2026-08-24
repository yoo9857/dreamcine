import { AppError } from '@aidream/core'
import { spawn } from 'node:child_process'
import { mkdir, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { buildHlsArgs, type HlsArgsInput } from './ffmpeg-args.js'
import { classifyFfmpegError } from './errors.js'
import type { RenditionSpec } from './ladder.js'

export interface TranscodeOptions {
  readonly durationSec: number
  readonly timeoutMs: number
  readonly ffmpegPath?: string
  readonly signal?: AbortSignal
  readonly onProgress?: (percent: number) => void
}

export interface TranscodeResult {
  readonly renditions: readonly {
    readonly spec: RenditionSpec
    readonly playlistPath: string
    readonly sizeBytes: number
  }[]
  readonly masterPath: string
  readonly totalBytes: number
}

export function transcodeToHls(
  input: HlsArgsInput,
  options: TranscodeOptions,
): Promise<TranscodeResult> {
  return runTranscode(input, options)
}

async function directoryBytes(path: string): Promise<number> {
  const entries = await readdir(path, { withFileTypes: true })
  let total = 0
  for (const entry of entries) {
    const childPath = join(path, entry.name)
    total += entry.isDirectory()
      ? await directoryBytes(childPath)
      : (await stat(childPath)).size
  }
  return total
}

async function runTranscode(
  input: HlsArgsInput,
  options: TranscodeOptions,
): Promise<TranscodeResult> {
  if (
    !Number.isFinite(options.durationSec) ||
    options.durationSec <= 0 ||
    !Number.isSafeInteger(options.timeoutMs) ||
    options.timeoutMs <= 0
  ) {
    throw new AppError('E_VALIDATION', { field: 'transcodeOptions' })
  }

  await mkdir(input.outDir, { recursive: true })
  await Promise.all(
    input.ladder.map((spec) =>
      mkdir(join(input.outDir, spec.name), { recursive: true }),
    ),
  )

  const child = spawn(
    options.ffmpegPath ?? process.env.FFMPEG_PATH ?? 'ffmpeg',
    buildHlsArgs(input),
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  const stderrLines: string[] = []
  let pending = ''
  let timedOut = false
  let lastPercent = 0

  const consumeLine = (line: string): void => {
    if (line !== '') {
      stderrLines.push(line)
      if (stderrLines.length > 100) stderrLines.shift()
    }
    const match = /^out_time_us=(\d+)$/u.exec(line)
    if (match?.[1] !== undefined) {
      const elapsedSec = Number(match[1]) / 1_000_000
      const percent = Math.min(
        100,
        Math.max(lastPercent, (elapsedSec / options.durationSec) * 100),
      )
      if (percent > lastPercent) {
        lastPercent = percent
        options.onProgress?.(percent)
      }
    }
  }

  child.stderr.on('data', (chunk: Buffer) => {
    pending += chunk.toString('utf8')
    const lines = pending.split(/\r?\n/u)
    pending = lines.pop() ?? ''
    lines.forEach(consumeLine)
  })

  let forceKillTimer: NodeJS.Timeout | undefined
  const terminate = (): void => {
    child.kill('SIGTERM')
    forceKillTimer = setTimeout(() => {
      child.kill('SIGKILL')
    }, 5_000)
    forceKillTimer.unref()
  }
  const timeout = setTimeout(() => {
    timedOut = true
    terminate()
  }, options.timeoutMs)
  timeout.unref()
  const abort = (): void => {
    terminate()
  }
  options.signal?.addEventListener('abort', abort, { once: true })

  let code: number | null
  try {
    code = await new Promise<number | null>((resolve, reject) => {
      child.once('error', reject)
      child.once('close', resolve)
    })
  } catch (error: unknown) {
    throw new AppError('E_MEDIA_TRANSCODE_FAILED', undefined, error)
  } finally {
    clearTimeout(timeout)
    if (forceKillTimer !== undefined) clearTimeout(forceKillTimer)
    options.signal?.removeEventListener('abort', abort)
  }
  if (pending !== '') consumeLine(pending)

  if (code !== 0) {
    const errorCode = classifyFfmpegError({
      stderr: stderrLines.join('\n'),
      timedOut,
    })
    throw new AppError(errorCode)
  }

  const masterPath = join(input.outDir, 'master.m3u8')
  const renditions = await Promise.all(
    input.ladder.map(async (spec) => {
      const renditionDir = join(input.outDir, spec.name)
      return {
        spec,
        playlistPath: join(renditionDir, 'index.m3u8'),
        sizeBytes: await directoryBytes(renditionDir),
      }
    }),
  )
  const totalBytes =
    renditions.reduce((sum, rendition) => sum + rendition.sizeBytes, 0) +
    (await stat(masterPath)).size
  if (lastPercent < 100) options.onProgress?.(100)
  return { renditions, masterPath, totalBytes }
}
