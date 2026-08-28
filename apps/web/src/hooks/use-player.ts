'use client'

import { useCallback, useEffect, useState } from 'react'

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

const DEFAULT_STATE: PlayerState = {
  status: 'idle',
  positionSec: 0,
  bufferedSec: 0,
  volume: 1,
  muted: false,
  playbackRate: 1,
  levels: [],
  currentLevel: -1,
  isFullscreen: false,
  errorCode: null,
}

function bufferedEnd(video: HTMLVideoElement): number {
  return video.buffered.length === 0
    ? 0
    : video.buffered.end(video.buffered.length - 1)
}

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

export function usePlayer(video: HTMLVideoElement | null): PlayerController {
  const [state, setState] = useState<PlayerState>(DEFAULT_STATE)
  const patch = useCallback((next: Partial<PlayerState>): void => {
    setState((current) => ({ ...current, ...next }))
  }, [])
  const togglePlayback = useCallback(async (): Promise<void> => {
    if (video === null) return
    if (video.paused || video.ended) await video.play()
    else video.pause()
  }, [video])
  const seek = useCallback(
    (positionSec: number): void => {
      if (video !== null)
        video.currentTime = Math.max(
          0,
          Math.min(positionSec, video.duration || 0),
        )
    },
    [video],
  )
  const seekBy = useCallback(
    (deltaSec: number): void => {
      seek((video?.currentTime ?? 0) + deltaSec)
    },
    [seek, video],
  )
  const setVolume = useCallback(
    (volume: number): void => {
      if (video === null) return
      video.volume = Math.max(0, Math.min(volume, 1))
      video.muted = false
      localStorage.setItem('aidream.player.volume', String(video.volume))
      localStorage.setItem('aidream.player.muted', 'false')
    },
    [video],
  )
  const toggleMuted = useCallback((): void => {
    if (video === null) return
    video.muted = !video.muted
    localStorage.setItem('aidream.player.muted', String(video.muted))
  }, [video])
  const setPlaybackRate = useCallback(
    (rate: number): void => {
      if (video === null) return
      video.playbackRate = Math.max(0.25, Math.min(rate, 2))
      localStorage.setItem(
        'aidream.player.playback-rate',
        String(video.playbackRate),
      )
    },
    [video],
  )
  const setLevel = useCallback(
    (level: number): void => {
      video?.dispatchEvent(
        new CustomEvent('aidream:set-level', { detail: level }),
      )
      patch({ currentLevel: level })
    },
    [patch, video],
  )
  const toggleFullscreen = useCallback(async (): Promise<void> => {
    if (video === null) return
    if (document.fullscreenElement !== null) {
      await document.exitFullscreen()
      return
    }
    const container = video.parentElement
    if (
      container !== null &&
      typeof container.requestFullscreen === 'function'
    ) {
      await container.requestFullscreen()
      return
    }
    if (typeof video.requestFullscreen === 'function') {
      await video.requestFullscreen()
      return
    }
    const iosVideo = video as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void
    }
    iosVideo.webkitEnterFullscreen?.()
  }, [video])

  useEffect(() => {
    if (video === null) return
    const storedVolume = Number(localStorage.getItem('aidream.player.volume'))
    if (Number.isFinite(storedVolume) && storedVolume >= 0 && storedVolume <= 1)
      video.volume = storedVolume
    video.muted = localStorage.getItem('aidream.player.muted') === 'true'
    const storedRate = Number(
      localStorage.getItem('aidream.player.playback-rate'),
    )
    if (Number.isFinite(storedRate) && storedRate >= 0.25 && storedRate <= 2)
      video.playbackRate = storedRate
    const sync = (): void => {
      patch({
        positionSec: video.currentTime,
        bufferedSec: bufferedEnd(video),
        volume: video.volume,
        muted: video.muted,
        playbackRate: video.playbackRate,
      })
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = video.paused
          ? 'paused'
          : 'playing'
        if (
          Number.isFinite(video.duration) &&
          video.duration > 0 &&
          typeof navigator.mediaSession.setPositionState === 'function'
        ) {
          try {
            navigator.mediaSession.setPositionState({
              duration: video.duration,
              playbackRate: video.playbackRate,
              position: Math.min(video.currentTime, video.duration),
            })
          } catch (error: unknown) {
            void error
          }
        }
      }
    }
    const onReady = (): void => {
      patch({
        status: video.ended ? 'ended' : video.paused ? 'paused' : 'playing',
      })
      sync()
    }
    const handlers: readonly [string, EventListener][] = [
      [
        'loadstart',
        () => {
          patch({ status: 'loading', errorCode: null })
        },
      ],
      [
        'playing',
        () => {
          patch({ status: 'playing' })
        },
      ],
      ['loadeddata', onReady],
      ['canplay', onReady],
      [
        'pause',
        () => {
          patch({ status: video.ended ? 'ended' : 'paused' })
        },
      ],
      [
        'waiting',
        () => {
          patch({ status: video.paused ? 'paused' : 'buffering' })
        },
      ],
      [
        'ended',
        () => {
          patch({ status: 'ended' })
        },
      ],
      ['timeupdate', sync],
      ['progress', sync],
      ['volumechange', sync],
      ['ratechange', sync],
      [
        'aidream:levels',
        (event) => {
          patch({
            levels: (event as CustomEvent<readonly PlayerLevel[]>).detail,
          })
        },
      ],
      [
        'aidream:player-error',
        (event) => {
          patch({
            status: 'error',
            errorCode: (event as CustomEvent<string>).detail,
          })
        },
      ],
    ]
    for (const [name, handler] of handlers)
      video.addEventListener(name, handler)
    sync()
    return () => {
      for (const [name, handler] of handlers)
        video.removeEventListener(name, handler)
    }
  }, [patch, video])

  useEffect(() => {
    if (video === null || !('mediaSession' in navigator)) return
    const session = navigator.mediaSession
    const actions: readonly [MediaSessionAction, MediaSessionActionHandler][] =
      [
        [
          'play',
          () => {
            void video.play()
          },
        ],
        [
          'pause',
          () => {
            video.pause()
          },
        ],
        [
          'seekbackward',
          (details) => {
            seekBy(-(details.seekOffset ?? 10))
          },
        ],
        [
          'seekforward',
          (details) => {
            seekBy(details.seekOffset ?? 10)
          },
        ],
        [
          'seekto',
          (details) => {
            if (details.seekTime !== undefined) seek(details.seekTime)
          },
        ],
      ]
    for (const [action, handler] of actions) {
      try {
        session.setActionHandler(action, handler)
      } catch (error: unknown) {
        void error
      }
    }
    return () => {
      for (const [action] of actions) {
        try {
          session.setActionHandler(action, null)
        } catch (error: unknown) {
          void error
        }
      }
    }
  }, [seek, seekBy, video])

  useEffect(() => {
    const onFullscreen = (): void => {
      patch({ isFullscreen: document.fullscreenElement !== null })
    }
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen)
    }
  }, [patch])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (video === null || isEditable(event.target)) return
      const key = event.key.toLowerCase()
      let handled = true
      if (key === ' ' || key === 'k') void togglePlayback()
      else if (key === 'arrowleft' || key === 'j') seekBy(-10)
      else if (key === 'arrowright' || key === 'l') seekBy(10)
      else if (key === 'arrowup') setVolume(video.volume + 0.1)
      else if (key === 'arrowdown') setVolume(video.volume - 0.1)
      else if (key === 'm') toggleMuted()
      else if (key === 'f') void toggleFullscreen()
      else if (key === ',') setPlaybackRate(video.playbackRate - 0.25)
      else if (key === '.') setPlaybackRate(video.playbackRate + 0.25)
      else if (/^[0-9]$/u.test(key)) seek((video.duration * Number(key)) / 10)
      else handled = false
      if (handled) event.preventDefault()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [
    seek,
    seekBy,
    setPlaybackRate,
    setVolume,
    toggleFullscreen,
    toggleMuted,
    togglePlayback,
    video,
  ])

  return {
    state,
    togglePlayback,
    seek,
    seekBy,
    setVolume,
    toggleMuted,
    setPlaybackRate,
    setLevel,
    toggleFullscreen,
  }
}
