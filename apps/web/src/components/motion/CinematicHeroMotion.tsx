'use client'

import { useEffect, useRef } from 'react'

interface CinematicHeroMotionProps {
  readonly chapter: string
  readonly label: string
  readonly tone?: 'red' | 'lime' | 'silver'
}

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value))

/**
 * A tiny, dependency-free motion controller shared by the public hero surfaces.
 * It only writes compositor-friendly CSS variables, throttled to animation frames.
 */
export function CinematicHeroMotion({
  chapter,
  label,
  tone = 'red',
}: CinematicHeroMotionProps) {
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layer = layerRef.current
    const hero = layer?.closest<HTMLElement>('[data-cinematic-hero]')
    if (hero === null || hero === undefined) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const precisePointer = window.matchMedia(
      '(hover: hover) and (pointer: fine)',
    )
    let pointerFrame = 0
    let scrollFrame = 0

    const writePointer = (event: PointerEvent) => {
      if (reducedMotion.matches || !precisePointer.matches) return
      const bounds = hero.getBoundingClientRect()
      const x =
        clamp((event.clientX - bounds.left) / bounds.width, 0, 1) * 2 - 1
      const y =
        clamp((event.clientY - bounds.top) / bounds.height, 0, 1) * 2 - 1
      window.cancelAnimationFrame(pointerFrame)
      pointerFrame = window.requestAnimationFrame(() => {
        hero.style.setProperty('--cinema-x', x.toFixed(3))
        hero.style.setProperty('--cinema-y', y.toFixed(3))
      })
    }

    const writeScroll = () => {
      window.cancelAnimationFrame(scrollFrame)
      scrollFrame = window.requestAnimationFrame(() => {
        if (reducedMotion.matches) {
          hero.style.setProperty('--cinema-scroll', '0')
          return
        }
        const bounds = hero.getBoundingClientRect()
        const travel = Math.max(bounds.height, window.innerHeight)
        const progress = clamp(-bounds.top / travel)
        hero.style.setProperty('--cinema-scroll', progress.toFixed(3))
      })
    }

    const resetPointer = () => {
      hero.style.setProperty('--cinema-x', '0')
      hero.style.setProperty('--cinema-y', '0')
    }

    hero.dataset.motionReady = 'true'
    writeScroll()
    hero.addEventListener('pointermove', writePointer, { passive: true })
    hero.addEventListener('pointerleave', resetPointer)
    window.addEventListener('scroll', writeScroll, { passive: true })
    window.addEventListener('resize', writeScroll)

    return () => {
      window.cancelAnimationFrame(pointerFrame)
      window.cancelAnimationFrame(scrollFrame)
      hero.removeEventListener('pointermove', writePointer)
      hero.removeEventListener('pointerleave', resetPointer)
      window.removeEventListener('scroll', writeScroll)
      window.removeEventListener('resize', writeScroll)
      delete hero.dataset.motionReady
    }
  }, [])

  return (
    <div
      ref={layerRef}
      className="cinematic-hero-motion"
      data-tone={tone}
      aria-hidden="true"
    >
      <span className="cinematic-hero-motion__frame" />
      <span className="cinematic-hero-motion__orbit cinematic-hero-motion__orbit--outer" />
      <span className="cinematic-hero-motion__orbit cinematic-hero-motion__orbit--inner" />
      <span className="cinematic-hero-motion__flare" />
      <span className="cinematic-hero-motion__grain" />
      <span className="cinematic-hero-motion__chapter">{chapter}</span>
      <span className="cinematic-hero-motion__label">{label}</span>
      <span className="cinematic-hero-motion__coordinates">
        <i /> REC&nbsp;&nbsp;24 FPS
      </span>
    </div>
  )
}
