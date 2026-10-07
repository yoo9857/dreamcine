'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

import { cn } from '@/lib/utils'

const useIsoLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

export interface CoverflowSlide {
  src: string
  alt: string
  title?: string
  subtitle?: string
  meta?: { label: string; value: string }[]
}

export interface CoverflowCarouselProps {
  slides: readonly CoverflowSlide[]
  rotate?: number
  depth?: number
  perspective?: number
  falloff?: number
  fade?: number
  cardWidth?: string
  gap?: number
  loop?: boolean
  showCaption?: boolean
  showPagination?: boolean
  showNavigation?: boolean
  label?: string
  className?: string
  cardClassName?: string
  /** Optional adaptations for cards with application content. */
  cardHeight?: string
  initialIndex?: number
  autoPlayInterval?: number
  renderSlide?: (
    slide: CoverflowSlide,
    index: number,
    active: boolean,
    select: () => void,
  ) => React.ReactNode
  navigationLabels?: {
    previous: string
    next: string
    pause: string
    play: string
    select: (slide: CoverflowSlide, index: number) => string
  }
}

export function CoverflowCarousel({
  slides,
  rotate = 44,
  depth = 0.6,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = 'clamp(148px, 22vw, 260px)',
  gap = 0.05,
  loop = true,
  showCaption = false,
  showPagination = false,
  showNavigation = false,
  label = 'Cover carousel',
  className,
  cardClassName,
  cardHeight = 'var(--cf-card)',
  initialIndex = 0,
  autoPlayInterval = 0,
  renderSlide,
  navigationLabels = {
    previous: 'Previous slide',
    next: 'Next slide',
    pause: 'Pause automatic slides',
    play: 'Start automatic slides',
    select: (_, index) => `Go to slide ${String(index + 1)}`,
  },
}: CoverflowCarouselProps) {
  const count = slides.length
  const start = Math.max(0, Math.min(count - 1, initialIndex))
  const frameRef = React.useRef<HTMLDivElement>(null)
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const posRef = React.useRef(start)
  const targetRef = React.useRef(start)
  const widthRef = React.useRef(0)
  const rafRef = React.useRef<number | null>(null)
  const reducedRef = React.useRef(false)
  const suppressClickRef = React.useRef(false)
  const dragRef = React.useRef<{
    id: number
    x: number
    pos: number
    v: number
    t: number
    moved: boolean
  } | null>(null)
  const [selected, setSelected] = React.useState(start)
  const [playing, setPlaying] = React.useState(true)
  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const [reduced, setReduced] = React.useState(false)

  const indexAt = React.useCallback(
    (pos: number) =>
      count === 0 ? 0 : ((Math.round(pos) % count) + count) % count,
    [count],
  )

  const paint = React.useCallback(() => {
    const width = widthRef.current
    if (!width || count === 0) return
    const pitch = width * (1 + gap)
    cardRefs.current.forEach((card, index) => {
      if (!card) return
      let offset = index - posRef.current
      if (loop) {
        offset = ((offset % count) + count) % count
        if (offset > count / 2) offset -= count
      }
      const distance = Math.abs(offset)
      const ramp = Math.pow(distance, falloff)
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset)
      card.style.transform =
        `translateX(calc(-50% + ${String(offset * pitch)}px)) ` +
        `translateZ(${String(-depth * width * ramp)}px) rotateY(${String(-tilt)}deg)`
      // Fade only around the ring seam; settled neighbours keep their faces visible.
      const edge =
        loop && count > 2
          ? Math.min(1, Math.max(0, (count / 2 - distance) * 2))
          : 1
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge)
      card.style.zIndex = String(100 - Math.round(distance))
    })
  }, [count, depth, fade, falloff, gap, loop, rotate])

  const settle = React.useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      targetRef.current = target
      setSelected(indexAt(target))
      if (reducedRef.current) {
        posRef.current = target
        paint()
        rafRef.current = null
        return
      }
      const step = () => {
        const remaining = target - posRef.current
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target
          paint()
          rafRef.current = null
          return
        }
        posRef.current += remaining * 0.16
        paint()
        rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    },
    [indexAt, paint],
  )

  const clamp = React.useCallback(
    (pos: number) => (loop ? pos : Math.max(0, Math.min(count - 1, pos))),
    [count, loop],
  )
  const goTo = React.useCallback(
    (index: number) => {
      if (count < 1) return
      const target = loop
        ? index + Math.round((targetRef.current - index) / count) * count
        : index
      settle(clamp(target))
    },
    [clamp, count, loop, settle],
  )
  const nudge = React.useCallback(
    (by: number) => {
      if (count < 2) return
      settle(clamp(Math.round(targetRef.current) + by))
    },
    [clamp, count, settle],
  )

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || count < 2) return
    suppressClickRef.current = false
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    targetRef.current = posRef.current
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      pos: posRef.current,
      v: 0,
      t: performance.now(),
      moved: false,
    }
  }
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    const pitch = widthRef.current * (1 + gap)
    if (!pitch) return
    if (!drag.moved) {
      if (Math.abs(event.clientX - drag.x) < 6) return
      drag.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
      suppressClickRef.current = true
    }
    const now = performance.now()
    const previous = posRef.current
    posRef.current = clamp(drag.pos - (event.clientX - drag.x) / pitch)
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000
    drag.t = now
    setSelected(indexAt(posRef.current))
    paint()
  }
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    dragRef.current = null
    if (!drag.moved) {
      // A tap can interrupt an animation; restore a whole card afterwards.
      settle(clamp(Math.round(posRef.current)))
      return
    }
    const carried =
      event.type === 'pointercancel'
        ? 0
        : performance.now() - drag.t > 100
          ? 0
          : Math.max(-2, Math.min(2, drag.v * 0.18))
    settle(clamp(Math.round(posRef.current + carried)))
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  useIsoLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    posRef.current = indexAt(posRef.current)
    targetRef.current = posRef.current
    setSelected(indexAt(posRef.current))
    const measure = () => {
      const card = cardRefs.current[0]
      if (!card) return
      widthRef.current = card.offsetWidth
      paint()
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => {
      observer.disconnect()
    }
  }, [indexAt, paint])

  React.useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      reducedRef.current = preference.matches
      setReduced(preference.matches)
      if (preference.matches && rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
        posRef.current = targetRef.current
        paint()
      }
    }
    update()
    preference.addEventListener('change', update)
    return () => {
      preference.removeEventListener('change', update)
    }
  }, [paint])
  React.useEffect(() => {
    if (
      !playing ||
      hovered ||
      focused ||
      reduced ||
      count < 2 ||
      autoPlayInterval < 1
    )
      return
    const timer = window.setInterval(() => {
      if (!document.hidden && dragRef.current === null) nudge(1)
    }, autoPlayInterval)
    return () => {
      window.clearInterval(timer)
    }
  }, [
    autoPlayInterval,
    count,
    focused,
    hovered,
    nudge,
    playing,
    reduced,
    selected,
  ])
  React.useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  const active = slides[selected]
  if (count === 0) return null
  return (
    <div
      className={cn('w-full', className)}
      style={{ '--cf-card': cardWidth } as React.CSSProperties}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => {
        setHovered(true)
      }}
      onMouseLeave={() => {
        setHovered(false)
      }}
      onFocusCapture={() => {
        setFocused(true)
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false)
      }}
    >
      <div className="relative">
        <div
          ref={frameRef}
          tabIndex={0}
          aria-label={label}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={(event) => {
            if (suppressClickRef.current) {
              event.preventDefault()
              event.stopPropagation()
              suppressClickRef.current = false
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault()
              nudge(event.key === 'ArrowLeft' ? -1 : 1)
            }
          }}
          className="coverflow-frame cursor-grab overflow-hidden py-10 outline-none focus-visible:ring-2 focus-visible:ring-[#e6c379] active:cursor-grabbing"
          style={{
            perspective: `calc(var(--cf-card) * ${String(perspective)})`,
            touchAction: 'pan-y',
          }}
        >
          <div
            className="relative select-none"
            style={{ height: cardHeight, transformStyle: 'preserve-3d' }}
          >
            {slides.map((slide, index) => (
              <div
                key={`${slide.src}-${String(index)}`}
                ref={(node) => {
                  cardRefs.current[index] = node
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${String(index + 1)} of ${String(count)}`}
                data-coverflow-index={index}
                data-active={index === selected}
                className={cn(
                  'absolute left-1/2 top-0 overflow-hidden rounded-2xl shadow-xl will-change-transform',
                  cardClassName,
                )}
                style={{ width: 'var(--cf-card)', height: cardHeight }}
              >
                {renderSlide ? (
                  renderSlide(slide, index, index === selected, () => {
                    goTo(index)
                  })
                ) : (
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    draggable={false}
                    className="h-full w-full select-none object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        {showNavigation && (
          <>
            <button
              type="button"
              aria-label={navigationLabels.previous}
              disabled={count < 2 || (!loop && selected === 0)}
              onClick={() => {
                nudge(-1)
              }}
              className="coverflow-prev absolute left-3 top-1/2 z-[200] -translate-y-1/2 rounded-full bg-black/60 p-2 text-white backdrop-blur transition hover:bg-black/80 disabled:opacity-30"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={navigationLabels.next}
              disabled={count < 2 || (!loop && selected === count - 1)}
              onClick={() => {
                nudge(1)
              }}
              className="coverflow-next absolute right-3 top-1/2 z-[200] -translate-y-1/2 rounded-full bg-black/60 p-2 text-white backdrop-blur transition hover:bg-black/80 disabled:opacity-30"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      {showCaption && active?.title && (
        <div
          className="mt-2 flex flex-col items-center px-6"
          aria-live={playing && autoPlayInterval > 0 ? 'off' : 'polite'}
        >
          <p className="text-[15px] font-semibold tracking-tight">
            {active.title}
          </p>
          {active.subtitle && (
            <p className="mt-1 text-[13px] opacity-60">{active.subtitle}</p>
          )}
          {active.meta && active.meta.length > 0 && (
            <dl className="mt-10 w-full max-w-[230px] text-[12px]">
              {active.meta.map((row) => (
                <div key={row.label} className="flex justify-between py-[5px]">
                  <dt className="opacity-60">{row.label}</dt>
                  <dd className="font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
      {(showPagination || autoPlayInterval > 0) && (
        <div className="coverflow-pagination mt-6 flex items-center justify-center gap-2">
          {showPagination &&
            slides.map((slide, index) => (
              <button
                key={index}
                type="button"
                aria-label={navigationLabels.select(slide, index)}
                aria-current={index === selected ? 'true' : undefined}
                onClick={() => {
                  goTo(index)
                }}
                className={cn(
                  'grid size-8 place-items-center rounded-full transition-opacity',
                  index === selected ? 'opacity-100' : 'opacity-40',
                )}
              >
                <span className="size-2 rounded-full bg-current" />
              </button>
            ))}
          {autoPlayInterval > 0 && (
            <button
              type="button"
              aria-label={
                playing && !reduced
                  ? navigationLabels.pause
                  : navigationLabels.play
              }
              aria-pressed={playing && !reduced}
              disabled={count < 2 || reduced}
              onClick={() => {
                setPlaying(!playing)
              }}
              className="coverflow-play grid size-8 place-items-center rounded-full disabled:opacity-30"
            >
              {playing && !reduced ? (
                <Pause className="size-4" aria-hidden="true" />
              ) : (
                <Play className="size-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
