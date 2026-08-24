'use client'

import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

export interface HlsPlayerProps {
  readonly masterUrl: string
  readonly posterUrl?: string
  readonly startAtSec: number
  readonly durationSec: number
  readonly spriteVttUrl?: string
  readonly autoPlay?: boolean
  readonly onProgress: (positionSec: number) => void
  readonly onWatchedSeconds: (total: number) => void
  readonly onEnded: () => void
  readonly onError: (code: string) => void
}

export function HlsPlayer(_props: HlsPlayerProps): ReactNode {
  throw new NotImplementedError('T07:HlsPlayer')
}
