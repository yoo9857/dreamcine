'use client'

import { useCallback, useEffect, useRef } from 'react'

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

function payload(positionSec: number, completed = false): string {
  return JSON.stringify({
    positionSec: Math.max(0, Math.floor(positionSec)),
    completed,
  })
}

export function useWatchProgress(
  options: WatchProgressOptions,
): WatchProgressController {
  const latestPosition = useRef(0)
  const viewReported = useRef(false)
  const progressUrl = `/api/episodes/${options.episodeId}/progress`
  const viewsUrl = `/api/episodes/${options.episodeId}/views`
  const postProgress = useCallback(
    (positionSec: number, completed = false): void => {
      if (!options.authenticated) return
      void fetch(progressUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: payload(positionSec, completed),
      }).catch(() => undefined)
    },
    [options.authenticated, progressUrl],
  )

  useEffect(() => {
    if (!options.authenticated) return
    const timer = window.setInterval(() => {
      postProgress(latestPosition.current)
    }, 15_000)
    return () => {
      window.clearInterval(timer)
    }
  }, [options.authenticated, postProgress])

  useEffect(() => {
    if (!options.authenticated) return
    const beacon = (): void => {
      navigator.sendBeacon(
        progressUrl,
        new Blob([payload(latestPosition.current)], {
          type: 'application/json',
        }),
      )
    }
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') beacon()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', beacon)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', beacon)
    }
  }, [options.authenticated, progressUrl])

  return {
    report(positionSec) {
      latestPosition.current = positionSec
    },
    reportPause(positionSec) {
      latestPosition.current = positionSec
      postProgress(positionSec)
    },
    reportWatchedSeconds(total) {
      if (total < 30 || viewReported.current) return
      viewReported.current = true
      void fetch(viewsUrl, {
        method: 'POST',
        credentials: 'same-origin',
      }).catch(() => undefined)
    },
    reportEnded(positionSec) {
      latestPosition.current = positionSec
      postProgress(positionSec, true)
    },
  }
}
