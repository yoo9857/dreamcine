'use client'

import React, { type ReactNode } from 'react'

import { HlsPlayer } from '@/src/components/player/HlsPlayer'

export function HiggsfieldPlayer({
  src,
  poster,
  durationSec,
  next,
}: {
  readonly src: string
  readonly poster: string
  readonly durationSec: number
  readonly next: { readonly id: string; readonly title: string } | null
}): ReactNode {
  return (
    <HlsPlayer
      masterUrl={src}
      posterUrl={poster}
      startAtSec={0}
      durationSec={durationSec}
      {...(next === null ? {} : { nextEpisode: next })}
      onProgress={() => undefined}
      onWatchedSeconds={() => undefined}
      onEnded={() => undefined}
      onError={() => undefined}
    />
  )
}
