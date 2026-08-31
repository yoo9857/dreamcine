'use client'

import type { FeedItem } from '@aidream/core'
import { Heart, Play, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useMemo, useState, type ReactNode } from 'react'

import { useInfiniteFeed } from '@/src/hooks/use-infinite-feed'

type WorkFormat = 'all' | 'long' | 'short'

function formatDuration(durationSec: number | null): string {
  if (durationSec === null) return '영상'
  const hours = Math.floor(durationSec / 3600)
  const minutes = Math.floor((durationSec % 3600) / 60)
  const seconds = Math.floor(durationSec % 60)
  return hours > 0
    ? `${String(hours)}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes)}:${String(seconds).padStart(2, '0')}`
}

function formatCount(value: string | number): string {
  const count = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(count)) return String(value)
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(count)
}

function Thumbnail({ item }: { readonly item: FeedItem }): ReactNode {
  return item.thumbUrl === null ? (
    <div className="works-thumbnail-placeholder" aria-hidden="true">
      <Play />
      <span>썸네일 준비 중</span>
    </div>
  ) : (
    <Image
      src={item.thumbUrl}
      alt={`${item.title} 썸네일`}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw"
      unoptimized
    />
  )
}

function CreatorAvatar({ item }: { readonly item: FeedItem }): ReactNode {
  return item.creator.avatarUrl === null ? (
    <span className="works-avatar-fallback" aria-hidden="true">
      {item.creator.displayName.slice(0, 1).toLocaleUpperCase()}
    </span>
  ) : (
    <Image
      src={item.creator.avatarUrl}
      alt=""
      width={38}
      height={38}
      unoptimized
      className="works-avatar-image"
    />
  )
}

function LongFormCard({ item }: { readonly item: FeedItem }): ReactNode {
  return (
    <article className="works-long-card">
      <Link className="works-long-visual" href={`/watch/${item.episodeId}`}>
        <Thumbnail item={item} />
        <span className="works-card-duration">
          {formatDuration(item.durationSec)}
        </span>
        <span className="works-card-play" aria-hidden="true">
          <Play />
        </span>
      </Link>
      <div className="works-long-info">
        <Link
          className="works-avatar"
          href={`/u/${item.creator.handle}`}
          aria-label={`${item.creator.displayName} 프로필`}
        >
          <CreatorAvatar item={item} />
        </Link>
        <div>
          <Link className="works-card-title" href={`/watch/${item.episodeId}`}>
            {item.title}
          </Link>
          <Link
            className="works-card-creator"
            href={`/u/${item.creator.handle}`}
          >
            {item.creator.displayName}
          </Link>
          <p className="works-card-meta">
            조회 {formatCount(item.viewCount)} · 좋아요{' '}
            {formatCount(item.likeCount)}
          </p>
        </div>
      </div>
    </article>
  )
}

function ShortFormCard({ item }: { readonly item: FeedItem }): ReactNode {
  return (
    <article className="works-short-card">
      <Link className="works-short-visual" href={`/watch/${item.episodeId}`}>
        <Thumbnail item={item} />
        <div className="works-short-shade" />
        <span className="works-short-badge">
          <Play aria-hidden="true" /> SHORT
        </span>
        <div className="works-short-copy">
          <h3>{item.title}</h3>
          <p>{item.creator.displayName}</p>
          <span>
            <Heart aria-hidden="true" /> {formatCount(item.likeCount)}
          </span>
        </div>
      </Link>
    </article>
  )
}

function WorkFormatMark({ format }: { readonly format: 'long' | 'short' }) {
  return (
    <span className={`works-section-icon is-${format}`} aria-hidden="true">
      <span className="works-format-monogram">
        <b>{format === 'long' ? 'L' : 'S'}</b>
        <i>F</i>
      </span>
      <span className="works-format-streak" />
    </span>
  )
}

function EmptyFormat({ label }: { readonly label: string }): ReactNode {
  return (
    <div className="works-format-empty">
      <Play aria-hidden="true" />
      <p>공개된 {label} 작품이 아직 없습니다.</p>
    </div>
  )
}

function LoadingCards({ format }: { readonly format: WorkFormat }): ReactNode {
  const count = format === 'short' ? 6 : 4
  return (
    <div
      className={`works-pagination-skeleton is-${format}`}
      aria-label="다음 작품 불러오는 중"
      role="status"
    >
      {Array.from({ length: count }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

export function WorksCatalog({
  initialItems,
  initialCursor,
}: {
  readonly initialItems: readonly FeedItem[]
  readonly initialCursor: string | null
}): ReactNode {
  const [format, setFormat] = useState<WorkFormat>('all')
  const feed = useInfiniteFeed({
    endpoint: '/api/feed?type=latest&limit=24',
    initialItems,
    initialCursor,
  })
  const { longForm, shortForm } = useMemo(() => {
    // 형식은 재생시간이 아니라 업로더가 작품 생성 시 선택한 workType으로
    // 결정한다. 짧은 롱폼 작품이 숏폼으로 잘못 노출되는 것을 방지한다.
    const short = feed.items.filter(
      (item) => item.series.workType === 'SHORT_FORM',
    )
    const long = feed.items.filter(
      (item) => item.series.workType !== 'SHORT_FORM',
    )
    return { longForm: long, shortForm: short }
  }, [feed.items])

  return (
    <>
      <header className="works-header">
        <div className="works-heading">
          <h1>작품</h1>
          <span>길게 몰입하고, 짧게 발견하세요.</span>
        </div>
        <nav className="works-format-nav" aria-label="작품 형식 필터">
          {(
            [
              ['all', 'ALL WORKS'],
              ['long', 'LONG FORM'],
              ['short', 'SHORT FORM'],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              className={format === value ? 'is-active' : undefined}
              aria-pressed={format === value}
              key={value}
              onClick={() => {
                setFormat(value)
              }}
            >
              {format === value ? <span aria-hidden="true" /> : null}
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="works-content">
        {format === 'short' ? null : (
          <section className="works-section" id="long-form">
            <header className="works-section-heading">
              <div>
                <WorkFormatMark format="long" />
                <div>
                  <h2>LONG FORM</h2>
                  <p>한 편의 이야기에 깊이 빠져보세요</p>
                </div>
              </div>
              <small>{longForm.length} LOADED</small>
            </header>
            {longForm.length === 0 ? (
              <EmptyFormat label="롱폼" />
            ) : (
              <div className="works-long-grid">
                {longForm.map((item) => (
                  <LongFormCard item={item} key={item.episodeId} />
                ))}
              </div>
            )}
          </section>
        )}

        {format === 'long' ? null : (
          <section
            className="works-section works-shorts-section"
            id="short-form"
          >
            <header className="works-section-heading">
              <div>
                <WorkFormatMark format="short" />
                <div>
                  <h2>SHORT FORM</h2>
                  <p>3분 안에 만나는 새로운 장면</p>
                </div>
              </div>
              <small>{shortForm.length} LOADED</small>
            </header>
            {shortForm.length === 0 ? (
              <EmptyFormat label="숏폼" />
            ) : (
              <div className="works-short-rail">
                {shortForm.map((item) => (
                  <ShortFormCard item={item} key={item.episodeId} />
                ))}
              </div>
            )}
          </section>
        )}

        <div className="works-pagination" ref={feed.sentinelRef}>
          {feed.isFetchingNextPage ? <LoadingCards format={format} /> : null}
          {feed.isFetchNextPageError ? (
            <div className="works-pagination-error" role="alert">
              <p>다음 작품을 불러오지 못했습니다.</p>
              <button type="button" onClick={() => void feed.fetchNextPage()}>
                <RefreshCw aria-hidden="true" /> 다시 시도
              </button>
            </div>
          ) : null}
          {feed.hasNextPage && !feed.isFetchingNextPage ? (
            <button
              type="button"
              className="works-load-more"
              onClick={() => void feed.fetchNextPage()}
            >
              MORE WORKS <span aria-hidden="true">↓</span>
            </button>
          ) : null}
          {!feed.hasNextPage && feed.items.length > 0 ? (
            <p className="works-catalog-end">
              <span /> 모든 작품을 확인했습니다
            </p>
          ) : null}
        </div>
      </main>
    </>
  )
}
