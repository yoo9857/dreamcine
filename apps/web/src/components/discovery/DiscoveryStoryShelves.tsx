import type { FeedItem } from '@aidream/core'
import Image from 'next/image'
import Link from 'next/link'
import React, { type ReactNode } from 'react'

interface ShelfCard {
  readonly id: string
  readonly href: string
  readonly title: string
  readonly subtitle: string
  readonly imageUrl: string
  readonly viewCount?: string
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
          },
        ],
  )
  return [...liveCards, ...curatedCards].slice(0, 8)
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
            <Link href={row.href}>
              모두 보기 <span aria-hidden="true">→</span>
            </Link>
          </header>
          <div className="discovery-shelf-track">
            {rotate(cards, row.offset).map((card, index) => (
              <article
                className="discovery-shelf-card"
                key={`${row.id}-${card.id}`}
              >
                <Link href={card.href} aria-label={`${card.title} 보기`}>
                  {'ranked' in row ? (
                    <strong className="discovery-shelf-rank" aria-hidden="true">
                      {index + 1}
                    </strong>
                  ) : null}
                  <div className="discovery-shelf-visual">
                    <Image
                      src={card.imageUrl}
                      alt=""
                      width={480}
                      height={270}
                      unoptimized={card.imageUrl.startsWith('http')}
                      sizes="(max-width: 767px) 54vw, (max-width: 1200px) 25vw, 18vw"
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
        </section>
      ))}
    </div>
  )
}
