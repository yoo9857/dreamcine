import { NotImplementedError } from '@aidream/core'

import type { HlsArgsInput } from './ffmpeg-args.js'
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
  void input
  void options
  throw new NotImplementedError('T06:transcodeToHls')
}
