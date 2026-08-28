'use client'

import type { PlaybackResponse } from '@aidream/core'
import type HlsType from 'hls.js'
import React, { useEffect, useRef, useState, type ReactNode } from 'react'

export function DiscoveryBackdrop({
  episodeId,
  loadOnMobile = false,
}: {
  readonly episodeId: string
  readonly loadOnMobile?: boolean
}): ReactNode {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [masterUrl, setMasterUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const constrainedViewport = window.matchMedia('(max-width: 767px)').matches

    // The backdrop is decorative. On small screens, loading HLS alongside the
    // priority hero image delays the useful first paint and spends mobile data.
    if (reduceMotion || (constrainedViewport && !loadOnMobile)) return

    const controller = new AbortController()
    void fetch(`/api/episodes/${episodeId}/playback`, {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null
        return (await response.json()) as PlaybackResponse
      })
      .then((playback) => {
        if (playback !== null) setMasterUrl(playback.masterUrl)
      })
      .catch(() => undefined)

    return () => {
      controller.abort()
    }
  }, [episodeId, loadOnMobile])

  useEffect(() => {
    const video = videoRef.current
    if (video === null || masterUrl === null) return

    let cancelled = false
    let hls: HlsType | null = null
    let visible = true
    let previewStart = 0
    let previewEnd = Number.POSITIVE_INFINITY

    const playWhenVisible = (): void => {
      if (visible && document.visibilityState === 'visible') {
        void video.play().catch(() => undefined)
      }
    }

    const onLoadedMetadata = (): void => {
      previewStart = video.duration > 12 ? 4 : 0
      previewEnd = video.duration > 26 ? 24 : video.duration
      if (previewStart > 0) video.currentTime = previewStart
      playWhenVisible()
    }

    const onTimeUpdate = (): void => {
      if (video.currentTime >= previewEnd) {
        video.currentTime = previewStart
        playWhenVisible()
      }
    }

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') video.pause()
      else playWhenVisible()
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false
        if (visible) playWhenVisible()
        else video.pause()
      },
      { threshold: 0.08 },
    )

    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('timeupdate', onTimeUpdate)
    document.addEventListener('visibilitychange', onVisibilityChange)
    observer.observe(video)

    const start = async (): Promise<void> => {
      if (video.canPlayType('application/vnd.apple.mpegurl') !== '') {
        video.src = masterUrl
      } else {
        const module = await import('hls.js')
        if (cancelled || !module.default.isSupported()) return
        hls = new module.default({
          autoStartLoad: true,
          capLevelToPlayerSize: true,
          maxBufferLength: 8,
          backBufferLength: 0,
        })
        hls.attachMedia(video)
        hls.loadSource(masterUrl)
      }

      video.muted = true
      playWhenVisible()
    }

    void start()
    return () => {
      cancelled = true
      observer.disconnect()
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('timeupdate', onTimeUpdate)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      hls?.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [masterUrl])

  if (masterUrl === null) return null

  return (
    <video
      ref={videoRef}
      className={`discovery-hero-video${playing ? ' is-playing' : ''}`}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
      onPlaying={() => {
        setPlaying(true)
      }}
    />
  )
}
