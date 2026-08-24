'use client'

import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

import type { PlayerState } from '@/src/hooks/use-player'

export interface PlayerControlsProps {
  readonly state: PlayerState
  readonly durationSec: number
  readonly onTogglePlayback: () => void
  readonly onSeek: (positionSec: number) => void
  readonly onSeekBy: (deltaSec: number) => void
  readonly onVolumeChange: (volume: number) => void
  readonly onToggleMuted: () => void
  readonly onPlaybackRateChange: (rate: number) => void
  readonly onToggleFullscreen: () => void
  readonly onLevelChange: (level: number) => void
}

export function PlayerControls(_props: PlayerControlsProps): ReactNode {
  throw new NotImplementedError('T07:PlayerControls')
}
