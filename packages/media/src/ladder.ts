import { NotImplementedError } from '@aidream/core'

export type RenditionName = '1080p' | '720p' | '480p' | '360p'

export interface RenditionSpec {
  readonly name: RenditionName
  readonly width: number
  readonly height: number
  readonly videoBitrateKbps: number
  readonly audioBitrateKbps: number
}

export function buildLadder(
  width: number,
  height: number,
  allowed: readonly RenditionName[],
): RenditionSpec[] {
  void width
  void height
  void allowed
  throw new NotImplementedError('T06:buildLadder')
}
