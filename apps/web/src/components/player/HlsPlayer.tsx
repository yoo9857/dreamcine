'use client'

import type HlsType from 'hls.js'
import { LoaderCircle, Pause, Play } from 'lucide-react'
import dynamic from 'next/dynamic'
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { usePlayer } from '@/src/hooks/use-player'
import { useWatchProgress } from '@/src/hooks/use-watch-progress'
import { NextEpisodeCard } from './NextEpisodeCard'
import { PlayerControls } from './PlayerControls'

export interface HlsPlayerProps {
  readonly masterUrl: string
  readonly posterUrl?: string
  readonly startAtSec: number
  readonly durationSec: number
  readonly spriteVttUrl?: string
  readonly spriteUrl?: string
  readonly autoPlay?: boolean
  readonly onProgress: (positionSec: number) => void
  readonly onWatchedSeconds: (total: number) => void
  readonly onEnded: () => void
  readonly onError: (code: string) => void
  readonly onPause?: (positionSec: number) => void
  readonly nextEpisode?: {
    readonly id: string
    readonly title: string
  }
}

interface SeekFrame {
  readonly startSec: number
  readonly endSec: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

function vttTime(value: string): number {
  const parts = value.split(':').map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part)))
    return 0
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
}

function parseSeekFrames(vtt: string): readonly SeekFrame[] {
  const pattern =
    /(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})[\s\S]*?#xywh=(\d+),(\d+),(\d+),(\d+)/gu
  return [...vtt.matchAll(pattern)].map((match) => ({
    startSec: vttTime(match[1] ?? '0:0:0'),
    endSec: vttTime(match[2] ?? '0:0:0'),
    x: Number(match[3]),
    y: Number(match[4]),
    width: Number(match[5]),
    height: Number(match[6]),
  }))
}

function HlsPlayerEngine(props: HlsPlayerProps): ReactNode {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [seekFrames, setSeekFrames] = useState<readonly SeekFrame[]>([])
  const controller = usePlayer(video)
  const callbacks = useRef(props)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  callbacks.current = props

  const clearHideTimer = useCallback((): void => {
    if (hideTimer.current !== null) clearTimeout(hideTimer.current)
    hideTimer.current = null
  }, [])

  const revealControls = useCallback((): void => {
    setControlsVisible(true)
    clearHideTimer()
    if (controller.state.status === 'playing')
      hideTimer.current = setTimeout(() => {
        setControlsVisible(false)
      }, 2600)
  }, [clearHideTimer, controller.state.status])

  useEffect(() => {
    revealControls()
    return clearHideTimer
  }, [clearHideTimer, controller.state.status, revealControls])

  useEffect(() => {
    if (props.spriteVttUrl === undefined) {
      setSeekFrames([])
      return
    }
    const abort = new AbortController()
    void fetch(props.spriteVttUrl, { signal: abort.signal })
      .then(async (response) => (response.ok ? response.text() : ''))
      .then((vtt) => {
        if (!abort.signal.aborted) setSeekFrames(parseSeekFrames(vtt))
      })
      .catch(() => undefined)
    return () => {
      abort.abort()
    }
  }, [props.spriteVttUrl])

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
      const module = await import('hls.js')
      if (cancelled) return
      const Hls = module.default
      if (!Hls.isSupported()) {
        if (video.canPlayType('application/vnd.apple.mpegurl') !== '') {
          video.src = props.masterUrl
          return
        }
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
      if (props.startAtSec > 0 && props.startAtSec < video.duration)
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

  const pictureInPictureSupported =
    video !== null &&
    typeof document !== 'undefined' &&
    document.pictureInPictureEnabled &&
    typeof video.requestPictureInPicture === 'function'
  const togglePictureInPicture = async (): Promise<void> => {
    if (video === null || !pictureInPictureSupported) return
    if (document.pictureInPictureElement === video)
      await document.exitPictureInPicture()
    else await video.requestPictureInPicture()
  }
  const playing = controller.state.status === 'playing'
  const busy =
    controller.state.status === 'loading' ||
    controller.state.status === 'buffering'

  return (
    <div
      className={`ilog-player${controlsVisible ? ' is-controls-visible' : ''}${playing ? ' is-playing' : ''}`}
      data-sprite-vtt={props.spriteVttUrl}
      onPointerMove={revealControls}
      onPointerDown={revealControls}
      onPointerLeave={() => {
        if (playing) setControlsVisible(false)
      }}
      onFocusCapture={revealControls}
    >
      <video
        ref={setVideo}
        className="ilog-player-video"
        poster={props.posterUrl}
        playsInline
        preload="metadata"
        aria-label="에피소드 동영상"
        onClick={() => {
          void controller.togglePlayback()
        }}
        onDoubleClick={() => {
          void controller.toggleFullscreen()
        }}
      />
      <div className="ilog-player-vignette" aria-hidden="true" />
      {busy ? (
        <div
          className="ilog-player-buffering"
          role="status"
          aria-label="영상을 불러오는 중"
        >
          <LoaderCircle />
        </div>
      ) : (
        <button
          type="button"
          className="ilog-player-center-action"
          aria-label={playing ? '일시정지' : '재생'}
          onClick={() => {
            void controller.togglePlayback()
          }}
        >
          {playing ? (
            <Pause fill="currentColor" />
          ) : (
            <Play fill="currentColor" />
          )}
        </button>
      )}
      <PlayerControls
        state={controller.state}
        durationSec={props.durationSec}
        {...(props.spriteUrl === undefined
          ? {}
          : { spriteUrl: props.spriteUrl })}
        seekFrames={seekFrames}
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
        {...(pictureInPictureSupported
          ? {
              onTogglePictureInPicture: () => {
                void togglePictureInPicture()
              },
            }
          : {})}
        onLevelChange={(level) => {
          controller.setLevel(level)
        }}
      />
      {controller.state.status === 'ended' ? (
        <NextEpisodeCard
          {...(props.nextEpisode === undefined
            ? {}
            : {
                episodeId: props.nextEpisode.id,
                title: props.nextEpisode.title,
              })}
          onReplay={() => {
            controller.seek(0)
            void controller.togglePlayback()
          }}
        />
      ) : null}
      {controller.state.status === 'error' ? (
        <p role="alert" className="ilog-player-error">
          영상을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
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
  readonly spriteUrl?: string
  readonly spriteVttUrl?: string
  readonly startAtSec: number
  readonly durationSec: number
  readonly nextEpisode?: {
    readonly id: string
    readonly title: string
  }
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
      {...(props.spriteUrl === undefined ? {} : { spriteUrl: props.spriteUrl })}
      {...(props.spriteVttUrl === undefined
        ? {}
        : { spriteVttUrl: props.spriteVttUrl })}
      startAtSec={props.startAtSec}
      durationSec={props.durationSec}
      {...(props.nextEpisode === undefined
        ? {}
        : { nextEpisode: props.nextEpisode })}
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
