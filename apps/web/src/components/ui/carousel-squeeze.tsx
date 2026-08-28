'use client'

import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type KeyboardEvent,
  useEffect,
  useRef,
  useMemo,
  useState,
} from 'react'
import { cn } from '@aidream/ui'

export interface SqueezeSlide {
  id?: string | number
  title: string
  description?: string
  image?: string
  imageAlt?: string
  background?: string
  overlay?: ReactNode
  action?: string
  href?: string
  target?: string
  onAction?: () => void
}

type Size = number | string
const cssSize = (value: Size) =>
  typeof value === 'number' ? `${String(value)}px` : value

function trackOffset(position: number): string {
  if (position <= 0) return '0px'
  const slats = Array.from(
    { length: position - 1 },
    () => 'calc(var(--sq-slat-width) + var(--sq-slat-gap))',
  ).join(' + ')
  return `calc(-72% - var(--sq-gap)${slats ? ` - ${slats}` : ''})`
}

export interface SqueezeCarouselProps
  extends Omit<ComponentProps<'div'>, 'onSelect'> {
  slides: SqueezeSlide[]
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  height?: Size
  gap?: Size
  slatGap?: Size
  slatWidth?: Size
  radius?: Size
  duration?: number
  autoplay?: boolean
  interval?: number
  hoverGrow?: boolean
  controls?: boolean
  accent?: string
  accentForeground?: string
  label?: string
  panelClassName?: string
}

export function SqueezeCarousel({
  slides,
  defaultIndex = 0,
  onIndexChange,
  height = 'clamp(180px, 32cqi, 340px)',
  gap = 16,
  slatGap = 8,
  slatWidth = 8,
  radius = 6,
  duration = 700,
  autoplay = false,
  interval = 6000,
  hoverGrow = true,
  controls = true,
  accent = 'var(--primary)',
  accentForeground = 'var(--primary-foreground)',
  label = 'Featured',
  panelClassName,
  className,
  style,
  ...props
}: SqueezeCarouselProps): ReactNode {
  const [active, setActive] = useState(() =>
    Math.max(0, Math.min(defaultIndex, slides.length - 1)),
  )
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(-1)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [animatingTo, setAnimatingTo] = useState<number | null>(null)
  const settleTimer = useRef<number | null>(null)
  const count = slides.length
  const select = (index: number) => {
    const next = (index + count) % count
    if (next === active || animatingTo !== null) return
    if (reducedMotion) {
      setActive(next)
      onIndexChange?.(next)
      return
    }
    setAnimatingTo(next)
    settleTimer.current = window.setTimeout(() => {
      setActive(next)
      setAnimatingTo(null)
      onIndexChange?.(next)
    }, duration)
  }
  useEffect(
    () => () => {
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
    },
    [],
  )
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      setReducedMotion(query.matches)
    }
    update()
    query.addEventListener('change', update)
    return () => {
      query.removeEventListener('change', update)
    }
  }, [])
  useEffect(() => {
    if (!autoplay || paused || reducedMotion || count < 2) return
    const timer = window.setInterval(() => {
      select(active + 1)
    }, interval)
    return () => {
      window.clearInterval(timer)
    }
  }, [active, autoplay, count, interval, paused, reducedMotion])
  const ordered = useMemo(
    () => slides.slice(0, Math.min(count, 6)),
    [count, slides],
  )
  if (!count) return null
  const current = slides[active]
  if (!current) return null
  const targetPosition = animatingTo ?? active
  const vars = {
    '--sq-h': cssSize(height),
    '--sq-gap': cssSize(gap),
    '--sq-slat-gap': cssSize(slatGap),
    '--sq-slat-width': cssSize(slatWidth),
    '--sq-radius': cssSize(radius),
    '--sq-ms': `${String(reducedMotion ? 0 : duration)}ms`,
    '--sq-fill': accent,
    '--sq-on-fill': accentForeground,
  } as CSSProperties
  return (
    <div
      className={cn('flex w-full flex-col', className)}
      style={{ containerType: 'inline-size', ...vars, ...style }}
      onMouseEnter={() => {
        setPaused(true)
      }}
      onMouseLeave={() => {
        setPaused(false)
        setHovered(-1)
      }}
      onFocusCapture={() => {
        setPaused(true)
      }}
      onBlurCapture={() => {
        setPaused(false)
      }}
      {...props}
    >
      {controls && count > 1 ? (
        <div className="mb-4 flex justify-end gap-2">
          <Arrow
            label="Previous"
            onClick={() => {
              select(active - 1)
            }}
            back
          />
          <Arrow
            label="Next"
            onClick={() => {
              select(active + 1)
            }}
          />
        </div>
      ) : null}
      <div
        className="w-full overflow-hidden"
        style={{ height: 'var(--sq-h)' }}
        role="tablist"
        aria-label={label}
      >
        <div
          className="flex h-full"
          style={{
            gap: 'var(--sq-slat-gap)',
            transform: `translateX(${trackOffset(Math.max(targetPosition, 0))})`,
            transition: `transform var(--sq-ms) cubic-bezier(0.16, 1, 0.3, 1)`,
          }}
        >
          {ordered.map((slide, index) => (
            <button
              key={slide.id ?? `${slide.title}-${String(index)}`}
              type="button"
              role="tab"
              aria-selected={index === 0}
              aria-label={slide.title}
              onClick={() => {
                select(index)
              }}
              onMouseMove={() => {
                if (hoverGrow && !reducedMotion) setHovered(index)
              }}
              onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                if (event.key === 'ArrowRight') select(active + 1)
                if (event.key === 'ArrowLeft') select(active - 1)
              }}
              className={cn(
                'relative isolate h-full shrink-0 cursor-pointer overflow-hidden bg-muted p-0',
                index === 0 ? 'w-[62%]' : 'w-[16%]',
                panelClassName,
              )}
              style={{
                borderRadius: `var(--sq-radius)`,
                width:
                  index === targetPosition
                    ? '72%'
                    : hovered === targetPosition
                      ? '16%'
                      : `calc(var(--sq-slat-width) + ${String(Math.max(1, ordered.length - index - 1) * 2)}px)`,
                transition: `width var(--sq-ms) cubic-bezier(0.16, 1, 0.3, 1)`,
              }}
            >
              {slide.image ? (
                <img
                  src={slide.image}
                  alt={slide.imageAlt ?? ''}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span
                  className="absolute inset-0"
                  style={{ background: slide.background }}
                  aria-hidden="true"
                />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
              {slide.overlay ? (
                <span className="absolute inset-x-0 bottom-0 p-4 text-left text-white">
                  {slide.overlay}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6" aria-live="polite">
        <p className="text-base leading-relaxed">
          <span className="text-foreground">{current.title}</span>
          {current.description ? (
            <span className="text-muted-foreground">
              {' '}
              {current.description}
            </span>
          ) : null}
        </p>
        {current.action ? <Action slide={current} /> : null}
      </div>
    </div>
  )
}

function Arrow({
  label,
  onClick,
  back = false,
}: {
  label: string
  onClick: () => void
  back?: boolean
}): ReactNode {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-md bg-[var(--sq-fill)] text-[var(--sq-on-fill)]"
    >
      <span aria-hidden="true">{back ? '←' : '→'}</span>
    </button>
  )
}

function Action({ slide }: { slide: SqueezeSlide }): ReactNode {
  const content = (
    <>
      {slide.action}
      <span aria-hidden="true"> ↗</span>
    </>
  )
  return slide.href ? (
    <a
      href={slide.href}
      target={slide.target}
      rel={slide.target === '_blank' ? 'noreferrer' : undefined}
      onClick={slide.onAction}
      className="mt-4 inline-flex rounded-md bg-[var(--sq-fill)] px-4 py-2 text-sm text-[var(--sq-on-fill)]"
    >
      {content}
    </a>
  ) : (
    <button
      type="button"
      onClick={slide.onAction}
      className="mt-4 inline-flex rounded-md bg-[var(--sq-fill)] px-4 py-2 text-sm text-[var(--sq-on-fill)]"
    >
      {content}
    </button>
  )
}

export default SqueezeCarousel
