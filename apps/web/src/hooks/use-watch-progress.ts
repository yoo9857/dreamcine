'use client'

import { NotImplementedError } from '@aidream/core'

export interface WatchProgressOptions {
  readonly episodeId: string
  readonly authenticated: boolean
}

export interface WatchProgressController {
  report(positionSec: number): void
  reportPause(positionSec: number): void
  reportWatchedSeconds(total: number): void
  reportEnded(positionSec: number): void
}

export function useWatchProgress(
  _options: WatchProgressOptions,
): WatchProgressController {
  throw new NotImplementedError('T07:useWatchProgress')
}
