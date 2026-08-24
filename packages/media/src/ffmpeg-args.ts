import { NotImplementedError } from '@aidream/core'

import type { RenditionSpec } from './ladder.js'

export interface HlsArgsInput {
  readonly inputPath: string
  readonly outDir: string
  readonly ladder: readonly RenditionSpec[]
  readonly rotation: number
}

export function buildHlsArgs(input: HlsArgsInput): string[] {
  void input
  throw new NotImplementedError('T06:buildHlsArgs')
}

export function buildThumbArgs(
  inputPath: string,
  atSec: number,
  outPath: string,
): string[] {
  void inputPath
  void atSec
  void outPath
  throw new NotImplementedError('T06:buildThumbArgs')
}

export function buildSpriteArgs(
  inputPath: string,
  durationSec: number,
  outPath: string,
): string[] {
  void inputPath
  void durationSec
  void outPath
  throw new NotImplementedError('T06:buildSpriteArgs')
}
