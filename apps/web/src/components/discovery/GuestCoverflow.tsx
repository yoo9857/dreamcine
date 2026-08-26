'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import React, { type CSSProperties, type ReactNode } from 'react'

export interface GuestCoverflowItem {
  readonly episodeId: string
  readonly href?: string
  readonly title: string
  readonly creatorName: string
  readonly thumbnailUrl: string | null
}

interface GuestCoverflowProps {
  readonly items: readonly GuestCoverflowItem[]
}

const useIsoLayoutEffect =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect

export function GuestCoverflow({ items }: GuestCoverflowProps): ReactNode {
  const count = items.length
  const frameRef = React.useRef<HTMLDivElement>(null)
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const positionRef = React.useRef(0)
  const targetRef = React.useRef(0)
  const widthRef = React.useRef(0)
  const animationRef = React.useRef<number | null>(null)
  const dragRef = React.useRef<{
    id: number
    x: number
    position: number
    velocity: number
    time: number
  } | null>(null)
  const [selected, setSelected] = React.useState(0)

  const indexAt = React.useCallback(
    (position: number) => ((Math.round(position) % count) + count) % count,
    [count],
  )

  const paint = React.useCallback(() => {
    const width = widthRef.current
    if (width === 0) return

    const pitch = width * 0.93
    const position = positionRef.current

    cardRefs.current.forEach((card, index) => {
      if (card === null) return

      let offset = index - position
      offset = ((offset % count) + count) % count
      if (offset > count / 2) offset -= count

      const distance = Math.abs(offset)
      const ramp = Math.pow(distance, 0.56)
      const tilt = Math.min(42 * ramp, 80) * Math.sign(offset)
      const edge =
        count < 4 ? 1 : Math.min(1, Math.max(0, count / 2 - distance))

      card.style.transform =
        `translateX(calc(-50% + ${String(offset * pitch)}px)) ` +
        `translateZ(${String(-0.62 * width * ramp)}px) ` +
        `rotateY(${String(-tilt)}deg)`
      card.style.opacity = String(Math.max(0, 1 - 0.11 * distance) * edge)
      card.style.zIndex = String(100 - Math.round(distance))
    })
  }, [count])

  const settle = React.useCallback(
    (target: number) => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }

      targetRef.current = target
      setSelected(indexAt(target))

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        positionRef.current = target
        paint()
        animationRef.current = null
        return
      }

      const step = (): void => {
        const remaining = target - positionRef.current
        if (Math.abs(remaining) < 0.0004) {
          positionRef.current = target
          paint()
          animationRef.current = null
          return
        }

        positionRef.current += remaining * 0.16
        paint()
        animationRef.current = requestAnimationFrame(step)
      }

      animationRef.current = requestAnimationFrame(step)
    },
    [indexAt, paint],
  )

  const goTo = React.useCallback(
    (index: number) => {
      const target =
        index + Math.round((targetRef.current - index) / count) * count
      settle(target)
    },
    [count, settle],
  )

  const nudge = React.useCallback(
    (amount: number) => {
      settle(Math.round(targetRef.current) + amount)
    },
    [settle],
  )

  useIsoLayoutEffect(() => {
    const frame = frameRef.current
    if (frame === null) return

    const measure = (): void => {
      const card = cardRefs.current[0]
      if (card === null || card === undefined) return
      widthRef.current = card.offsetWidth
      paint()
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => {
      observer.disconnect()
    }
  }, [paint])

  React.useEffect(
    () => () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    },
    [],
  )

  const active = items[selected] ?? items[0]
  if (active === undefined) return null

  return (
    <div
      className="guest-coverflow"
      style={{ '--cover-card': 'clamp(172px, 20vw, 292px)' } as CSSProperties}
      role="region"
      aria-roledescription="carousel"
      aria-label="주목받는 이야기"
    >
      <div className="guest-coverflow-stage">
        <div
          ref={frameRef}
          className="guest-coverflow-frame"
          tabIndex={0}
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return
            if (animationRef.current !== null) {
              cancelAnimationFrame(animationRef.current)
              animationRef.current = null
            }
            event.currentTarget.setPointerCapture(event.pointerId)
            targetRef.current = positionRef.current
            dragRef.current = {
              id: event.pointerId,
              x: event.clientX,
              position: positionRef.current,
              velocity: 0,
              time: performance.now(),
            }
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (drag === null || drag.id !== event.pointerId) return

            const pitch = widthRef.current * 0.93
            if (pitch === 0) return

            const now = performance.now()
            const previous = positionRef.current
            positionRef.current =
              drag.position - (event.clientX - drag.x) / pitch
            drag.velocity =
              ((positionRef.current - previous) /
                Math.max(now - drag.time, 1)) *
              1000
            drag.time = now
            const index = indexAt(positionRef.current)
            if (index !== selected) setSelected(index)
            paint()
          }}
          onPointerUp={(event) => {
            const drag = dragRef.current
            if (drag === null || drag.id !== event.pointerId) return
            dragRef.current = null
            const carried = Math.max(-2, Math.min(2, drag.velocity * 0.18))
            settle(Math.round(positionRef.current + carried))
          }}
          onPointerCancel={(event) => {
            if (dragRef.current?.id !== event.pointerId) return
            dragRef.current = null
            settle(Math.round(positionRef.current))
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              nudge(-1)
            } else if (event.key === 'ArrowRight') {
              event.preventDefault()
              nudge(1)
            }
          }}
        >
          <div className="guest-coverflow-rack">
            {items.map((item, index) => (
              <div
                key={item.episodeId}
                ref={(node) => {
                  cardRefs.current[index] = node
                }}
                className="guest-coverflow-card"
                role="group"
                aria-roledescription="slide"
                aria-label={`${String(index + 1)} / ${String(count)}: ${item.title}`}
              >
                {item.thumbnailUrl === null ? (
                  <div className="guest-coverflow-placeholder" />
                ) : (
                  <Image
                    src={item.thumbnailUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 767px) 52vw, 20vw"
                    draggable={false}
                  />
                )}
                <span aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {count > 1 ? (
          <>
            <button
              type="button"
              className="guest-coverflow-nav is-prev"
              aria-label="이전 이야기"
              onClick={() => {
                nudge(-1)
              }}
            >
              <ChevronLeft size={19} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="guest-coverflow-nav is-next"
              aria-label="다음 이야기"
              onClick={() => {
                nudge(1)
              }}
            >
              <ChevronRight size={19} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      <div className="guest-coverflow-caption" aria-live="polite">
        <span>{String(selected + 1).padStart(2, '0')}</span>
        <div>
          <h3>{active.title}</h3>
          <p>{active.creatorName}</p>
        </div>
        <Link href={active.href ?? `/watch/${active.episodeId}`}>
          지금 보기 <span aria-hidden="true">↗</span>
        </Link>
      </div>

      {count > 1 ? (
        <div className="guest-coverflow-dots" aria-label="이야기 선택">
          {items.map((item, index) => (
            <button
              key={item.episodeId}
              type="button"
              aria-label={`${String(index + 1)}번 이야기로 이동`}
              aria-current={index === selected ? 'true' : undefined}
              onClick={() => {
                goTo(index)
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
