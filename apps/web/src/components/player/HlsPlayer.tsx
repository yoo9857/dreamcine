'use client'

import type HlsType from 'hls.js'
import dynamic from 'next/dynamic'
import React, { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePlayer } from '@/src/hooks/use-player'
import { useWatchProgress } from '@/src/hooks/use-watch-progress'
import { PlayerControls } from './PlayerControls'

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
  readonly onPause?: (positionSec: number) => void
}

function HlsPlayerEngine(props: HlsPlayerProps): ReactNode {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const controller = usePlayer(video)
  const callbacks = useRef(props)
  callbacks.current = props

  useEffect(() => {
    if (video === null) return
    let cancelled = false
    let hls: HlsType | null = null
    let networkRetries = 0
    let mediaRetries = 0
    const fail = (code: string): void => {
      video.dispatchEvent(
        new CustomEvent('aidream:player-error', { detail: code }),
      )
      callbacks.current.onError(code)
    }
    const initialize = async (): Promise<void> => {
      if (video.canPlayType('application/vnd.apple.mpegurl') !== '') {
        video.src = props.masterUrl
        return
      }
      const module = await import('hls.js')
      if (cancelled) return
      const Hls = module.default
      if (!Hls.isSupported()) {
        fail('E_PLAYER_UNSUPPORTED')
        return
      }
      hls = new Hls({
        startLevel: -1,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 30,
        enableWorker: true,
        lowLatencyMode: false,
        fragLoadingMaxRetry: 4,
        manifestLoadingMaxRetry: 3,
      })
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels =
          hls?.levels.map((level, index) => ({
            index,
            height: level.height,
            bitrate: level.bitrate,
          })) ?? []
        video.dispatchEvent(
          new CustomEvent('aidream:levels', { detail: levels }),
        )
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || hls === null) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 3) {
          networkRetries += 1
          hls.startLoad()
          return
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries < 2) {
          mediaRetries += 1
          hls.recoverMediaError()
          return
        }
        hls.destroy()
        hls = null
        fail(
          data.type === Hls.ErrorTypes.NETWORK_ERROR
            ? 'E_PLAYER_NETWORK'
            : 'E_PLAYER_MEDIA',
        )
      })
      hls.attachMedia(video)
      hls.loadSource(props.masterUrl)
    }
    const onLevel = (event: Event): void => {
      if (hls !== null) hls.currentLevel = (event as CustomEvent<number>).detail
    }
    video.addEventListener('aidream:set-level', onLevel)
    void initialize().catch(() => {
      fail('E_PLAYER_LOAD')
    })
    return () => {
      cancelled = true
      video.removeEventListener('aidream:set-level', onLevel)
      hls?.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [props.masterUrl, video])

  useEffect(() => {
    if (video === null) return
    let watched = 0
    let previous = video.currentTime
    const onMetadata = (): void => {
      if (props.startAtSec > 0 && props.startAtSec < video.duration - 30)
        video.currentTime = props.startAtSec
      if (props.autoPlay === true)
        void video.play().catch(() => {
          video.muted = true
          return video.play()
        })
    }
    const onTime = (): void => {
      const delta = video.currentTime - previous
      if (!video.paused && delta > 0 && delta < 3) {
        watched += delta
        props.onWatchedSeconds(watched)
      }
      previous = video.currentTime
      props.onProgress(video.currentTime)
    }
    const onPause = (): void => {
      if (!video.ended) props.onPause?.(video.currentTime)
    }
    const onEnded = (): void => {
      props.onEnded()
    }
    video.addEventListener('loadedmetadata', onMetadata)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)
    return () => {
      video.removeEventListener('loadedmetadata', onMetadata)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
    }
  }, [
    props.autoPlay,
    props.onEnded,
    props.onPause,
    props.onProgress,
    props.onWatchedSeconds,
    props.startAtSec,
    video,
  ])

  return (
    <div
      className="overflow-hidden rounded-lg bg-black"
      data-sprite-vtt={props.spriteVttUrl}
    >
      <video
        ref={setVideo}
        className="aspect-video w-full"
        poster={props.posterUrl}
        playsInline
        preload="metadata"
        aria-label="에피소드 동영상"
      />
      <PlayerControls
        state={controller.state}
        durationSec={props.durationSec}
        onTogglePlayback={() => {
          void controller.togglePlayback()
        }}
        onSeek={(position) => {
          controller.seek(position)
        }}
        onSeekBy={(delta) => {
          controller.seekBy(delta)
        }}
        onVolumeChange={(volume) => {
          controller.setVolume(volume)
        }}
        onToggleMuted={() => {
          controller.toggleMuted()
        }}
        onPlaybackRateChange={(rate) => {
          controller.setPlaybackRate(rate)
        }}
        onToggleFullscreen={() => {
          void controller.toggleFullscreen()
        }}
        onLevelChange={(level) => {
          controller.setLevel(level)
        }}
      />
      {controller.state.status === 'error' ? (
        <p role="alert" className="p-3 text-white">
          동영상을 불러오지 못했습니다. 다시 시도해 주세요.
        </p>
      ) : null}
    </div>
  )
}

export const HlsPlayer = dynamic(async () => Promise.resolve(HlsPlayerEngine), {
  ssr: false,
})

export interface WatchPlayerProps {
  readonly episodeId: string
  readonly authenticated: boolean
  readonly masterUrl: string
  readonly posterUrl?: string
  readonly startAtSec: number
  readonly durationSec: number
}

export function WatchPlayer(props: WatchPlayerProps): ReactNode {
  const progress = useWatchProgress({
    episodeId: props.episodeId,
    authenticated: props.authenticated,
  })
  return (
    <HlsPlayer
      masterUrl={props.masterUrl}
      {...(props.posterUrl === undefined ? {} : { posterUrl: props.posterUrl })}
      startAtSec={props.startAtSec}
      durationSec={props.durationSec}
      onProgress={(position) => {
        progress.report(position)
      }}
      onPause={(position) => {
        progress.reportPause(position)
      }}
      onWatchedSeconds={(total) => {
        progress.reportWatchedSeconds(total)
      }}
      onEnded={() => {
        progress.reportEnded(props.durationSec)
      }}
      onError={() => undefined}
    />
  )
}
