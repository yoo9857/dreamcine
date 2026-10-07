'use client'

import { LazyMotion, useInView, useReducedMotion } from 'framer-motion'
import * as m from 'framer-motion/m'
import { ArrowRight, Pause, Play } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEventHandler,
  type ReactNode,
} from 'react'

import styles from './prisma-hero.module.css'

const loadMotionFeatures = () =>
  import('./prisma-motion-features').then((module) => module.default)

function PrismaMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      {children}
    </LazyMotion>
  )
}

interface WordsPullUpProps {
  text: string
  className?: string
  showAsterisk?: boolean
  style?: CSSProperties
}

export function WordsPullUp({
  text,
  className = '',
  showAsterisk = false,
  style,
}: WordsPullUpProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const reducedMotion = useReducedMotion()
  const words = text.split(' ')
  return (
    <PrismaMotion>
      <div
        ref={ref}
        className={`inline-flex flex-wrap ${className}`}
        style={style}
      >
        {words.map((word, index) => (
          <m.span
            key={`${word}-${String(index)}`}
            initial={reducedMotion ? false : { y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{
              duration: reducedMotion ? 0 : 0.6,
              delay: reducedMotion ? 0 : index * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`inline-block relative ${styles.word ?? ''}`}
            style={{ marginRight: index === words.length - 1 ? 0 : '0.25em' }}
          >
            {word}
            {showAsterisk && index === words.length - 1 ? (
              <span className={styles.asterisk} aria-hidden="true">
                *
              </span>
            ) : null}
          </m.span>
        ))}
      </div>
    </PrismaMotion>
  )
}

interface Segment {
  text: string
  className?: string
}
interface WordsPullUpMultiStyleProps {
  segments: Segment[]
  className?: string
  style?: CSSProperties
}

export function WordsPullUpMultiStyle({
  segments,
  className = '',
  style,
}: WordsPullUpMultiStyleProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const reducedMotion = useReducedMotion()
  const words = segments.flatMap((segment) =>
    segment.text
      .split(' ')
      .filter(Boolean)
      .map((word) => ({ word, className: segment.className })),
  )
  return (
    <PrismaMotion>
      <div
        ref={ref}
        className={`inline-flex flex-wrap justify-center ${className}`}
        style={style}
      >
        {words.map((word, index) => (
          <m.span
            key={`${word.word}-${String(index)}`}
            initial={reducedMotion ? false : { y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{
              duration: reducedMotion ? 0 : 0.6,
              delay: reducedMotion ? 0 : index * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`inline-block ${word.className ?? ''}`}
            style={{ marginRight: '0.25em' }}
          >
            {word.word}
          </m.span>
        ))}
      </div>
    </PrismaMotion>
  )
}

export interface PrismaNavItem {
  label: string
  href: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  active?: boolean
}
export const PRISMA_NAV_ITEMS: readonly PrismaNavItem[] = [
  { label: '우리들은?', href: '#about' },
  { label: '지원서 신청', href: '#apply' },
  { label: '접수현황', href: '#status' },
  { label: 'Q&A', href: '#faq' },
  { label: '혜택', href: '#benefits' },
]
export function PrismaNavigation({
  items = PRISMA_NAV_ITEMS,
}: {
  items?: readonly PrismaNavItem[]
}) {
  return (
    <nav className={styles.nav} aria-label="크리에이터 모집 페이지">
      <div>
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={item.onClick}
            aria-current={item.active ? 'page' : undefined}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

export interface PrismaHeroProps {
  title?: string
  headline?: string
  description?: string
  videoSrc?: string | null
  mobileVideoSrc?: string | null
  posterSrc?: string | null
  navItems?: readonly PrismaNavItem[]
  actionLabel?: string
  actionHref?: string
  onAction?: MouseEventHandler<HTMLAnchorElement>
  brand?: ReactNode
  className?: string
  backgroundOnly?: boolean
  contentReady?: boolean
  showNavigation?: boolean
}

export function PrismaHero({
  title = 'ILOG',
  headline = 'AI 영화와 드라마, 함께 만들어요.',
  description = '감독, 작가, AI 비주얼 아티스트, 프로듀서를 모집합니다. 작품 링크와 만들고 싶은 이야기로 당신의 다음 장면을 시작하세요.',
  videoSrc = '/brand/creator/ilog-cinematic-loop.mp4',
  mobileVideoSrc = videoSrc === '/brand/creator/ilog-cinematic-loop.mp4'
    ? '/brand/creator/ilog-cinematic-mobile.mp4'
    : null,
  posterSrc = '/brand/creator/ilog-cinematic-poster.jpg',
  navItems = PRISMA_NAV_ITEMS,
  actionLabel = '지금 지원서 작성하기',
  actionHref = '#apply',
  onAction,
  brand,
  className = '',
  backgroundOnly = false,
  contentReady = true,
  showNavigation = true,
}: PrismaHeroProps) {
  const reducedMotion = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const syncPlayback = () => {
      if (paused || reducedMotion || document.hidden) video.pause()
      else
        void video.play().catch(() => {
          if (!document.hidden) setPaused(true)
        })
    }
    syncPlayback()
    document.addEventListener('visibilitychange', syncPlayback)
    return () => {
      document.removeEventListener('visibilitychange', syncPlayback)
    }
  }, [paused, reducedMotion])
  return (
    <PrismaMotion>
      <section
        className={`${styles.hero ?? ''} ${backgroundOnly ? (styles.ambient ?? '') : ''} ${className}`}
        aria-labelledby={backgroundOnly ? undefined : 'creator-call-title'}
        aria-label={backgroundOnly ? '크리에이터 페이지 배경' : undefined}
      >
        <div
          className={`relative h-full w-full overflow-hidden ${styles.frame ?? ''}`}
        >
          {videoSrc && !reducedMotion && !videoFailed ? (
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className={styles.video}
              poster={posterSrc ?? undefined}
              onError={() => {
                setVideoFailed(true)
              }}
              aria-hidden="true"
            >
              {mobileVideoSrc ? (
                <source
                  src={mobileVideoSrc}
                  media="(max-width: 760px)"
                  type="video/mp4"
                />
              ) : null}
              <source src={videoSrc} type="video/mp4" />
            </video>
          ) : posterSrc ? (
            <div
              className={styles.poster}
              style={{ backgroundImage: `url("${posterSrc}")` }}
              aria-hidden="true"
            />
          ) : null}
          <div className={styles.noise} aria-hidden="true" />
          <div className={styles.shade} aria-hidden="true" />
          {!backgroundOnly && brand ? (
            <div className={styles.brand}>{brand}</div>
          ) : null}
          {!backgroundOnly && showNavigation ? (
            <PrismaNavigation items={navItems} />
          ) : null}
          <div
            className={styles.heroMeta}
            hidden={backgroundOnly || !contentReady}
          >
            <span>ILOG · CREATOR CALL</span>
            <span>상시 모집 · 순차 검토</span>
          </div>
          {videoSrc && !reducedMotion && !videoFailed ? (
            <button
              type="button"
              className={styles.playback}
              aria-label={paused ? '배경 영상 재생' : '배경 영상 일시정지'}
              onClick={() => {
                setPaused(!paused)
              }}
            >
              {paused ? <Play size={15} /> : <Pause size={15} />}
            </button>
          ) : null}
          <div
            className={styles.content}
            hidden={backgroundOnly || !contentReady}
          >
            <div className={styles.title} aria-hidden="true">
              <WordsPullUp text={title} showAsterisk />
            </div>
            <m.div
              initial={reducedMotion ? false : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: reducedMotion ? 0 : 0.8,
                delay: reducedMotion ? 0 : 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={styles.copy}
            >
              <p className={styles.eyebrow}>새로운 시선, 다음 이야기.</p>
              <h1 id="creator-call-title">{headline}</h1>
              <p className={styles.description}>{description}</p>
              <a
                href={actionHref}
                onClick={onAction}
                className={`group inline-flex items-center ${styles.action ?? ''}`}
              >
                {actionLabel}
                <span>
                  <ArrowRight size={19} />
                </span>
              </a>
              <small>로그인 없이 지원 · 별도 파일 첨부 없음</small>
            </m.div>
          </div>
        </div>
      </section>
    </PrismaMotion>
  )
}
