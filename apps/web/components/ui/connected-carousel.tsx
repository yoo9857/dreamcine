'use client'

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  UserRound,
} from 'lucide-react'

import { cn } from '@/lib/utils'

export interface CarouselItem {
  id: string | number
  stat: string
  quote: string
  author: string
  role: string
  defaultImage: string
  selectedImage: string
  alt?: string
  href?: string
  actionLabel?: string
}

export interface CalendlyCarouselProps extends HTMLAttributes<HTMLDivElement> {
  items: readonly CarouselItem[]
  autoPlayInterval?: number
  pauseOnHover?: boolean
}

type ScreenTier = 'mobile' | 'tablet' | 'desktop'
const TRANSITION_SPRING = {
  type: 'spring',
  stiffness: 220,
  damping: 26,
  mass: 0.75,
} as const

function CarouselImage({
  src,
  alt,
  priority = false,
}: {
  readonly src: string
  readonly alt: string
  readonly priority?: boolean
}) {
  const [failed, setFailed] = useState(false)
  return src === '' || failed ? (
    <div className="flex size-full items-center justify-center bg-[#162c3a]">
      <UserRound className="size-12 text-[#90a4b0]" aria-hidden="true" />
    </div>
  ) : (
    <Image
      alt={alt}
      src={src}
      fill
      unoptimized
      draggable={false}
      priority={priority}
      style={{ objectFit: 'cover', objectPosition: 'center top' }}
      onError={() => {
        setFailed(true)
      }}
    />
  )
}

/** The supplied connected carousel, adapted for unique creator cards and site navigation. */
export function CalendlyCarousel({
  items,
  autoPlayInterval = 6000,
  pauseOnHover = false,
  className,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  onFocusCapture,
  onBlurCapture,
  'aria-label': label = '이달의 작가 슬라이드쇼',
  ...props
}: CalendlyCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastTimeRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)
  const progressTimeRef = useRef(0)
  const [page, setPage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [containerWidth, setContainerWidth] = useState(1200)
  const [isReady, setIsReady] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const uid = useId()
  const total = items.length
  const activeIndex = total === 0 ? 0 : ((page % total) + total) % total
  const tier: ScreenTier =
    containerWidth < 768
      ? 'mobile'
      : containerWidth < 1120
        ? 'tablet'
        : 'desktop'
  const activeDimensions = {
    desktop: { width: 762, height: 480 },
    tablet: { width: Math.min(560, containerWidth - 180), height: 440 },
    mobile: {
      width: Math.max(200, Math.min(340, containerWidth - 48)),
      height: 490,
    },
  }[tier]
  const paused =
    isPaused ||
    isHidden ||
    isFocused ||
    (pauseOnHover && isHovered) ||
    reducedMotion

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width !== undefined && width > 0) setContainerWidth(width)
    })
    observer.observe(container)
    const visibility = () => {
      setIsHidden(document.hidden)
    }
    document.addEventListener('visibilitychange', visibility)
    visibility()
    const preference =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null
    const updateMotion = () => {
      setReducedMotion(preference?.matches ?? false)
    }
    updateMotion()
    setIsReady(true)
    preference?.addEventListener('change', updateMotion)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      preference?.removeEventListener('change', updateMotion)
    }
  }, [total])

  useEffect(() => {
    if (paused || total < 2 || autoPlayInterval <= 0) {
      lastTimeRef.current = null
      return
    }
    let frame = 0
    const step = (timestamp: number) => {
      lastTimeRef.current ??= timestamp
      elapsedRef.current += timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp
      if (elapsedRef.current >= autoPlayInterval) {
        elapsedRef.current = 0
        lastTimeRef.current = null
        setProgress(0)
        setPage((current) => current + 1)
        return
      }
      if (timestamp - progressTimeRef.current >= 100) {
        progressTimeRef.current = timestamp
        setProgress(
          Math.min((elapsedRef.current / autoPlayInterval) * 100, 100),
        )
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frame)
      lastTimeRef.current = null
    }
  }, [page, paused, total, autoPlayInterval])

  const move = useCallback((offset: number) => {
    elapsedRef.current = 0
    lastTimeRef.current = null
    setProgress(0)
    setPage((current) => current + offset)
  }, [])
  const select = (index: number) => {
    let diff = index - activeIndex
    if (diff > total / 2) diff -= total
    if (diff < -total / 2) diff += total
    move(diff)
  }
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    const element = event.target as HTMLElement
    if (element.closest('input,textarea,select') !== null) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      move(-1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      move(1)
    }
    if (event.key === 'Home') {
      event.preventDefault()
      select(0)
    }
    if (event.key === 'End') {
      event.preventDefault()
      select(total - 1)
    }
  }

  if (total === 0) return null

  return (
    <div
      {...props}
      ref={containerRef}
      data-carousel-ready={isReady}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={keyboard}
      onMouseEnter={(event) => {
        setIsHovered(true)
        onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        setIsHovered(false)
        onMouseLeave?.(event)
      }}
      onFocusCapture={(event) => {
        setIsFocused(true)
        onFocusCapture?.(event)
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setIsFocused(false)
        onBlurCapture?.(event)
      }}
      className={cn(
        'connected-carousel relative mx-auto flex w-full max-w-[1240px] flex-col items-center overflow-hidden py-4',
        className,
      )}
    >
      <div
        id={`${uid}-panel`}
        role="group"
        aria-roledescription="slide"
        aria-label={`${String(activeIndex + 1)} / ${String(total)} · ${items[activeIndex]?.author ?? ''}`}
        aria-live={paused ? 'polite' : 'off'}
        className="relative flex w-full items-center justify-center"
        style={{ height: activeDimensions.height }}
      >
        {items.map((item, index) => {
          let offset = index - activeIndex
          if (offset > total / 2) offset -= total
          if (offset < -total / 2) offset += total
          const isActive = offset === 0
          const visible =
            isActive || Math.abs(offset) <= (tier === 'desktop' ? 2 : 1)
          const sideWidth =
            tier === 'desktop' && Math.abs(offset) > 1
              ? 74
              : tier === 'mobile'
                ? 60
                : 105
          const sideHeight =
            tier === 'desktop' && Math.abs(offset) > 1
              ? 205
              : tier === 'mobile'
                ? 410
                : 344
          const gap = tier === 'mobile' ? 16 : 20
          const sideX =
            offset < 0
              ? -activeDimensions.width / 2 -
                gap -
                sideWidth -
                (Math.abs(offset) > 1 ? 90 : 0)
              : activeDimensions.width / 2 +
                gap +
                (Math.abs(offset) > 1 ? 121 : 0)
          return (
            <motion.div
              key={item.id}
              data-carousel-id={item.id}
              data-active={isActive}
              aria-hidden={!isActive}
              initial={false}
              animate={{
                x: isActive ? -activeDimensions.width / 2 : sideX,
                y: isActive ? -activeDimensions.height / 2 : -sideHeight / 2,
                width: isActive ? activeDimensions.width : sideWidth,
                height: isActive ? activeDimensions.height : sideHeight,
                opacity: visible ? 1 : 0,
                zIndex: isActive ? 2 : 1,
              }}
              transition={reducedMotion ? { duration: 0 } : TRANSITION_SPRING}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                willChange: 'transform',
                pointerEvents: visible ? 'auto' : 'none',
              }}
              className="connected-carousel-card rounded-[28px] bg-[#0e202b] text-[#f5f7f8] shadow-xl"
            >
              {!isActive && Math.abs(offset) <= 2 && visible ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 z-10 my-auto text-[#0e202b]"
                  style={{
                    width: 22,
                    height: 42,
                    ...(offset < 0
                      ? { left: 'calc(100% - 1px)' }
                      : { right: 'calc(100% - 1px)' }),
                  }}
                >
                  <svg
                    viewBox="0 0 20 37.3338"
                    preserveAspectRatio="none"
                    className="block size-full overflow-visible fill-current"
                  >
                    <path d="M0 0C0 0 1.2422 13.5759 10 13.5759C18.7578 13.5759 20 0 20 0V37.3338C20 37.3338 18.7578 23.7578 10 23.7578C1.2422 23.7578 0 37.3338 0 37.3338V0Z" />
                  </svg>
                </div>
              ) : null}
              <div
                className="relative size-full overflow-hidden"
                style={{ borderRadius: 'inherit' }}
              >
                <motion.div
                  initial={false}
                  animate={{ opacity: isActive ? 0 : 1 }}
                  transition={{ duration: reducedMotion ? 0 : 0.22 }}
                  className="absolute inset-0 p-2"
                  style={{ pointerEvents: isActive ? 'none' : 'auto' }}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      select(index)
                    }}
                    className="relative size-full cursor-pointer overflow-hidden rounded-[20px] border-0 bg-[#162c3a] p-0"
                    aria-label={`${item.author} 선택`}
                  >
                    <CarouselImage src={item.defaultImage} alt="" />
                  </button>
                </motion.div>
                <div
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: activeDimensions.width,
                    height: activeDimensions.height,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: isActive ? 'auto' : 'none',
                  }}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      x: isActive ? 0 : offset < 0 ? -822 : 822,
                    }}
                    transition={
                      reducedMotion ? { duration: 0 } : TRANSITION_SPRING
                    }
                    className={cn(
                      'flex size-full gap-4 p-5 sm:gap-6 sm:p-7',
                      tier === 'mobile' ? 'flex-col' : 'flex-row',
                    )}
                  >
                    <div
                      className={cn(
                        'flex min-w-0 flex-1 flex-col justify-between gap-3',
                        tier === 'mobile'
                          ? 'items-center text-center'
                          : 'items-start text-left',
                      )}
                    >
                      <span className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[.15em] text-[#e6c379]">
                        MONTHLY BEST · {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3
                        className="w-full text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
                        title={item.stat}
                      >
                        {item.stat}
                      </h3>
                      <p
                        className={cn(
                          'text-sm leading-relaxed text-[#b6c5ce]',
                          tier === 'mobile' ? 'line-clamp-3' : 'line-clamp-5',
                        )}
                      >
                        {item.quote}
                      </p>
                      <div className="flex max-w-full flex-col gap-2">
                        <strong className="text-sm text-[#f5f7f8]">
                          {item.author}
                        </strong>
                        <span className="text-xs text-[#90a6b4]">
                          {item.role}
                        </span>
                      </div>
                      {item.href === undefined ? null : (
                        <Link
                          href={item.href}
                          tabIndex={isActive ? 0 : -1}
                          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#e6c379]/40 bg-[#e6c379]/10 px-4 py-2 text-xs font-semibold text-[#e6c379]"
                        >
                          {item.actionLabel ?? '작가 프로필 보기'}
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                    <div
                      className={cn(
                        'relative shrink-0 overflow-hidden rounded-[22px] bg-[#162c3a]',
                        tier === 'mobile'
                          ? 'min-h-0 w-full flex-1'
                          : 'h-full w-[44%]',
                      )}
                    >
                      <CarouselImage
                        src={item.selectedImage}
                        alt={item.alt ?? item.author}
                        priority={index === 0}
                      />
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
      <div className="mt-5 flex max-w-full flex-wrap items-center justify-center gap-3 px-3">
        <button
          type="button"
          onClick={() => {
            move(-1)
          }}
          disabled={total < 2}
          aria-label="이전 작가"
          className="flex size-10 items-center justify-center rounded-full border border-white/15 text-white disabled:opacity-30"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <div
          role="group"
          aria-label="작가 선택"
          className="flex items-center gap-2"
        >
          {items.map((item, index) => {
            const selected = index === activeIndex
            return (
              <button
                key={item.id}
                type="button"
                aria-label={`${item.author} 보기`}
                aria-current={selected ? 'true' : undefined}
                aria-controls={`${uid}-panel`}
                onClick={() => {
                  select(index)
                }}
                className={cn(
                  'flex h-10 items-center rounded-lg p-0',
                  selected ? 'w-16' : 'w-4',
                )}
              >
                <span
                  className={cn(
                    'relative block h-1.5 w-full overflow-hidden rounded-full bg-white/20',
                    selected && 'bg-[#e6c379]/25',
                  )}
                >
                  {selected ? (
                    <span
                      className="absolute inset-0 origin-left rounded-full bg-[#e6c379]"
                      style={{
                        transform: `scaleX(${String(paused ? 1 : progress / 100)})`,
                      }}
                    />
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            move(1)
          }}
          disabled={total < 2}
          aria-label="다음 작가"
          className="flex size-10 items-center justify-center rounded-full border border-white/15 text-white disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            setIsPaused((current) => !current)
          }}
          disabled={total < 2 || reducedMotion}
          aria-label={
            isPaused ? '자동 슬라이드 재생' : '자동 슬라이드 일시정지'
          }
          aria-pressed={isPaused || reducedMotion}
          className="flex size-10 items-center justify-center rounded-full border border-white/15 text-white disabled:opacity-30"
        >
          {isPaused ? (
            <Play className="size-3.5" aria-hidden="true" />
          ) : (
            <Pause className="size-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  )
}
