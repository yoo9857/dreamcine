import { NotImplementedError } from '@aidream/core'

export interface ThumbnailOptions {
  readonly inputPath: string
  readonly outDir: string
  readonly durationSec: number
  readonly makeSprite: boolean
  readonly ffmpegPath?: string
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
  void options
  throw new NotImplementedError('T06:makeThumbnails')
}
