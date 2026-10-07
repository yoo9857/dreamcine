'use client'

import { isShortFormWork, type FeedItem } from '@aidream/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  HIGGSFIELD_CREATOR,
  HIGGSFIELD_FILMS,
  higgsfieldWatchPath,
} from '@/src/content/higgsfield'

interface ShelfCard {
  readonly id: string
  readonly href: string
  readonly title: string
  readonly subtitle: string
  readonly imageUrl: string
  readonly viewCount?: string
  /** 숏폼. 16:9 줄이 아니라 9:16 목록에 올린다. */
  readonly vertical?: boolean
}

const curatedCards: readonly ShelfCard[] = [
  {
    id: 'memory',
    href: '/series/preview-1',
    title: '내일의 기억',
    subtitle: '한빈 · AI FILM',
    imageUrl: '/brand/posters/memory.png',
  },
  {
    id: 'city',
    href: '/series/preview-2',
    title: '사라지는 도시의 밤',
    subtitle: 'ILOG ORIGINAL',
    imageUrl: '/brand/posters/city.png',
  },
  {
    id: 'moon-letter',
    href: '/series/preview-3',
    title: '달에게 보내는 편지',
    subtitle: 'ROMANCE · SHORT',
    imageUrl: '/brand/posters/moon-letter.png',
  },
  {
    id: 'last-frame',
    href: '/series/preview-4',
    title: '마지막 프레임',
    subtitle: 'DRAMA · FILM',
    imageUrl: '/brand/posters/last-frame.png',
  },
  {
    id: 'tomorrow',
    href: '/series/preview-5',
    title: '우리가 만든 내일',
    subtitle: 'SCI-FI · SERIES',
    imageUrl: '/brand/posters/tomorrow.png',
  },
] as const

const rows = [
  {
    id: 'trending',
    eyebrow: 'TRENDING NOW',
    title: '지금 가장 많이 보는 이야기',
    href: '/search',
    offset: 0,
    ranked: true,
  },
  {
    id: 'evergreen',
    eyebrow: 'ALL-TIME FAVORITES',
    title: '언제나 사랑받는 이야기',
    href: '/search?q=명작',
    offset: 2,
  },
  {
    id: 'romance',
    eyebrow: 'LOVE & CONNECTION',
    title: '마음이 머무는 로맨스',
    href: '/search?q=로맨스',
    offset: 4,
  },
  {
    id: 'drama',
    eyebrow: 'DEEP STORIES',
    title: '한 장면씩 깊어지는 드라마',
    href: '/search?q=드라마',
    offset: 1,
  },
  {
    id: 'film',
    eyebrow: 'CINEMATIC PICKS',
    title: '오늘 밤을 위한 영화',
    href: '/search?q=영화',
    offset: 3,
  },
] as const

function rotate<T>(items: readonly T[], offset: number): readonly T[] {
  if (items.length === 0) return items
  const start = offset % items.length
  return [...items.slice(start), ...items.slice(0, start)]
}

/**
 * "지금 가장 많이 보는" 순위. 조회수가 큰 순서로 세운다 — 피드 순서를 그대로
 * 쓰면 1위에 조회 0 작품이 오기도 했다. 조회가 같으면 원래 순서를 지킨다.
 */
function byViews(cards: readonly ShelfCard[]): readonly ShelfCard[] {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((left, right) => {
      const a =
        left.card.viewCount === undefined ? -1n : BigInt(left.card.viewCount)
      const b =
        right.card.viewCount === undefined ? -1n : BigInt(right.card.viewCount)
      if (a === b) return left.index - right.index
      return b > a ? 1 : -1
    })
    .map(({ card }) => card)
}

function higgsfieldShelfCards(): readonly ShelfCard[] {
  return HIGGSFIELD_FILMS.map((film) => ({
    id: `higgsfield-${film.slug}`,
    href: higgsfieldWatchPath(film.slug),
    title: film.title,
    subtitle: HIGGSFIELD_CREATOR.displayName,
    imageUrl: film.poster,
  }))
}

function cardsFrom(items: readonly FeedItem[]): readonly ShelfCard[] {
  const liveCards = items.flatMap((item): readonly ShelfCard[] =>
    item.thumbUrl === null
      ? []
      : [
          {
            id: item.episodeId,
            href: `/watch/${item.episodeId}`,
            title: item.title,
            subtitle: `${item.series.title} · ${item.creator.displayName}`,
            imageUrl: item.thumbUrl,
            viewCount: item.viewCount,
            vertical: isShortFormWork(item),
          },
        ],
  )
  // 공개 작품이 없을 때만 디자인용 카드를 쓴다. 실제 작품이 있으면 그 뒤에
  // Higgsfield 출품작으로 칸을 채우고, 미리보기 시리즈는 붙이지 않는다.
  if (liveCards.length === 0)
    return process.env.NODE_ENV === 'development'
      ? curatedCards
      : higgsfieldShelfCards()
  return [...liveCards, ...higgsfieldShelfCards()].slice(0, 8)
}

function ShelfTrack({
  cards,
  rowId,
  ranked,
  portrait = false,
}: {
  readonly cards: readonly ShelfCard[]
  readonly rowId: string
  readonly ranked: boolean
  readonly portrait?: boolean
}): ReactNode {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canPrevious, setCanPrevious] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const updateEdges = useCallback(() => {
    const track = trackRef.current
    if (track === null) return
    setCanPrevious(track.scrollLeft > 4)
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (track === null) return
    updateEdges()
    track.addEventListener('scroll', updateEdges, { passive: true })
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateEdges)
    observer?.observe(track)
    return () => {
      track.removeEventListener('scroll', updateEdges)
      observer?.disconnect()
    }
  }, [updateEdges])

  function move(direction: -1 | 1): void {
    const track = trackRef.current
    if (track === null) return
    track.scrollBy({
      left: direction * Math.max(track.clientWidth * 0.82, 240),
      behavior: 'smooth',
    })
  }

  return (
    <div className="discovery-shelf-stage">
      <div
        className={
          portrait
            ? 'discovery-shelf-track is-portrait'
            : 'discovery-shelf-track'
        }
        ref={trackRef}
        id={`shelf-track-${rowId}`}
      >
        {cards.map((card, index) => (
          <article className="discovery-shelf-card" key={`${rowId}-${card.id}`}>
            <Link href={card.href} aria-label={`${card.title} 보기`}>
              {ranked ? (
                <strong className="discovery-shelf-rank" aria-hidden="true">
                  {index + 1}
                </strong>
              ) : null}
              <div className="discovery-shelf-visual">
                <Image
                  src={card.imageUrl}
                  alt=""
                  width={card.vertical === true ? 270 : 480}
                  height={card.vertical === true ? 480 : 270}
                  unoptimized={card.imageUrl.startsWith('http')}
                  sizes={
                    card.vertical === true
                      ? '(max-width: 767px) 32vw, (max-width: 1200px) 16vw, 11vw'
                      : '(max-width: 767px) 54vw, (max-width: 1200px) 25vw, 18vw'
                  }
                />
                <span className="discovery-shelf-play" aria-hidden="true">
                  ▶
                </span>
                {card.viewCount === undefined ? null : (
                  <small>조회 {card.viewCount}</small>
                )}
              </div>
              <div className="discovery-shelf-copy">
                <h3>{card.title}</h3>
                <p>{card.subtitle}</p>
              </div>
            </Link>
          </article>
        ))}
      </div>
      <div className="discovery-shelf-arrows" aria-label="선반 이동">
        <button
          type="button"
          aria-label="이전 작품"
          aria-controls={`shelf-track-${rowId}`}
          disabled={!canPrevious}
          onClick={() => {
            move(-1)
          }}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="다음 작품"
          aria-controls={`shelf-track-${rowId}`}
          disabled={!canNext}
          onClick={() => {
            move(1)
          }}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function ShelfTracks({
  cards,
  rowId,
  ranked,
}: {
  readonly cards: readonly ShelfCard[]
  readonly rowId: string
  readonly ranked: boolean
}): ReactNode {
  const wide = cards.filter((card) => card.vertical !== true)
  const tall = cards.filter((card) => card.vertical === true)
  return (
    <>
      {wide.length === 0 ? null : (
        <ShelfTrack cards={wide} rowId={rowId} ranked={ranked} />
      )}
      {tall.length === 0 ? null : (
        <ShelfTrack
          cards={tall}
          rowId={`${rowId}-short`}
          ranked={false}
          portrait
        />
      )}
    </>
  )
}

export function DiscoveryStoryShelves({
  items,
}: {
  readonly items: readonly FeedItem[]
}): ReactNode {
  const cards = cardsFrom(items)
  return (
    <div className="discovery-shelves" aria-label="추천 이야기 모음">
      {rows.map((row) => (
        <section
          className="discovery-shelf"
          aria-labelledby={`shelf-${row.id}`}
          key={row.id}
        >
          <header>
            <div>
              <span>{row.eyebrow}</span>
              <h2 id={`shelf-${row.id}`}>{row.title}</h2>
            </div>
            <div className="discovery-shelf-header-actions">
              <Link href={row.href}>
                모두 보기 <span aria-hidden="true">→</span>
              </Link>
            </div>
          </header>
          <ShelfTracks
            cards={'ranked' in row ? byViews(cards) : rotate(cards, row.offset)}
            rowId={row.id}
            ranked={'ranked' in row}
          />
        </section>
      ))}
    </div>
  )
}
