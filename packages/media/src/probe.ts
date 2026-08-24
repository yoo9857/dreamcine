import { NotImplementedError } from '@aidream/core'

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
  void filePath
  void options
  throw new NotImplementedError('T06:probe')
}
