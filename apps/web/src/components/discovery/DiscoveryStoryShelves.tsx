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
  readonly imageUrl: string | null
  readonly viewCount?: string
  /** 숏폼. 16:9 줄이 아니라 9:16 목록에 올린다. */
  readonly vertical?: boolean
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
  return items.map((item) => ({
    id: item.episodeId,
    href: `/watch/${item.episodeId}`,
    title: item.title,
    subtitle: `${item.series.title} · ${item.creator.displayName}`,
    imageUrl: item.thumbUrl,
    viewCount: item.viewCount,
    vertical: isShortFormWork(item),
  }))
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
                {card.imageUrl === null ? (
                  <div className="discovery-shelf-no-image">썸네일 준비 중</div>
                ) : (
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
                )}
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
  latestItems = items,
}: {
  readonly items: readonly FeedItem[]
  readonly latestItems?: readonly FeedItem[]
}): ReactNode {
  const popular = byViews(cardsFrom(items))
  const latest = cardsFrom(latestItems)
  const rows = [
    {
      id: 'trending',
      eyebrow: 'TRENDING NOW',
      title: '지금 가장 많이 보는 이야기',
      href: '/works?sort=popular',
      cards: popular,
      ranked: true,
    },
    {
      id: 'latest',
      eyebrow: 'NEW RELEASES',
      title: '새로 올라온 이야기',
      href: '/works?sort=latest',
      cards: latest,
    },
    {
      id: 'long',
      eyebrow: 'LONG FORM',
      title: '깊이 몰입하는 롱폼',
      href: '/works?format=long',
      cards: latest.filter((card) => card.vertical !== true),
    },
    {
      id: 'short',
      eyebrow: 'SHORT FORM',
      title: '짧게 발견하는 숏폼',
      href: '/works?format=short',
      cards: latest.filter((card) => card.vertical === true),
    },
    {
      id: 'curated',
      eyebrow: 'ILOG CURATED',
      title: 'Higgsfield 영화제 큐레이션',
      href: '/u/higgsfield',
      cards: higgsfieldShelfCards(),
    },
  ]
  return (
    <div className="discovery-shelves" aria-label="추천 이야기 모음">
      {rows
        .filter((row) => row.cards.length > 0)
        .map((row) => (
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
                <Link href={row.href} aria-label={`${row.title} 모두 보기`}>
                  모두 보기 <span aria-hidden="true">→</span>
                </Link>
              </div>
            </header>
            <ShelfTracks
              cards={row.cards.slice(0, 8)}
              rowId={row.id}
              ranked={row.ranked === true}
            />
          </section>
        ))}
    </div>
  )
}
