'use client'

import { NotImplementedError } from '@aidream/core'

export interface PlayerLevel {
  readonly index: number
  readonly height: number
  readonly bitrate: number
}

export interface PlayerState {
  readonly status:
    | 'idle'
    | 'loading'
    | 'playing'
    | 'paused'
    | 'buffering'
    | 'ended'
    | 'error'
  readonly positionSec: number
  readonly bufferedSec: number
  readonly volume: number
  readonly muted: boolean
  readonly playbackRate: number
  readonly levels: readonly PlayerLevel[]
  readonly currentLevel: number
  readonly isFullscreen: boolean
  readonly errorCode: string | null
}

export interface PlayerController {
  readonly state: PlayerState
  togglePlayback(): Promise<void>
  seek(positionSec: number): void
  seekBy(deltaSec: number): void
  setVolume(volume: number): void
  toggleMuted(): void
  setPlaybackRate(rate: number): void
  setLevel(level: number): void
  toggleFullscreen(): Promise<void>
}

export function usePlayer(_video: HTMLVideoElement | null): PlayerController {
  throw new NotImplementedError('T07:usePlayer')
}
