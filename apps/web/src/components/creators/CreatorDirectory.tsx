'use client'

import { ArrowLeft, ArrowUpRight, Film, Play, Search, X } from 'lucide-react'
import Link from 'next/link'
import React, { useMemo, useState, type ReactNode } from 'react'

import { CalendlyCarousel } from '@/components/ui/connected-carousel'

import { UserBadges } from '@/src/components/user/UserTierLine'
import type {
  CreatorDirectoryItem,
  CreatorWorkPreview,
} from '@/src/services/user/get-featured-creators'

type SortMode = 'featured' | 'followers' | 'works'
const sortOptions: readonly { value: SortMode; label: string }[] = [
  { value: 'featured', label: '전체 작가' },
  { value: 'followers', label: '팔로워순' },
  { value: 'works', label: '공개 작품순' },
]

function followerLabel(value: number | null): string {
  return value === null
    ? '비공개'
    : new Intl.NumberFormat('ko-KR', {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value)
}

function creatorBio(creator: CreatorDirectoryItem, fallback: string): string {
  const bio = creator.bio?.trim()
  return bio === undefined || bio.length === 0 ? fallback : bio
}

function CreatorPortrait({
  creator,
}: {
  readonly creator: CreatorDirectoryItem
}): ReactNode {
  const [failed, setFailed] = useState(false)
  return creator.avatarUrl === null || failed ? (
    <span className="creator-avatar-fallback" aria-hidden="true">
      {creator.displayName.trim().slice(0, 1).toUpperCase()}
    </span>
  ) : (
    <img
      src={creator.avatarUrl}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => {
        setFailed(true)
      }}
    />
  )
}

function WorkPreview({
  work,
}: {
  readonly work: CreatorWorkPreview
}): ReactNode {
  const [failed, setFailed] = useState(false)
  const duration =
    work.durationSec === null
      ? null
      : `${String(Math.floor(work.durationSec / 60))}:${String(work.durationSec % 60).padStart(2, '0')}`
  return (
    <Link
      href={work.watchPath}
      className="creator-work-preview"
      aria-label={`${work.title} 재생`}
    >
      <div className="creator-work-image">
        {work.posterUrl === null || failed ? (
          <Film aria-hidden="true" />
        ) : (
          <img
            src={work.posterUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => {
              setFailed(true)
            }}
          />
        )}
        <span className="creator-work-play">
          <Play aria-hidden="true" />
        </span>
        {duration === null ? null : (
          <span className="creator-work-duration">{duration}</span>
        )}
      </div>
      <strong>{work.title}</strong>
      <span>
        작품 감상하기 <ArrowUpRight aria-hidden="true" />
      </span>
    </Link>
  )
}

function CreatorWorld({
  creator,
}: {
  readonly creator: CreatorDirectoryItem
}): ReactNode {
  const profilePath = `/u/${encodeURIComponent(creator.handle)}`
  return (
    <article className="creator-world" id={`creator-${creator.handle}`}>
      <div className="creator-world-identity">
        <Link href={profilePath} className="creator-world-profile">
          <div className="creator-world-avatar">
            <CreatorPortrait creator={creator} />
          </div>
          <div>
            <h3>{creator.displayName}</h3>
            <span>@{creator.handle}</span>
          </div>
        </Link>
        <UserBadges user={creator} />
        <p>
          {creatorBio(creator, '작품으로 전하는 이 작가의 시선을 만나보세요.')}
        </p>
        <dl>
          <div>
            <dt>공개 작품</dt>
            <dd>{creator.seriesCount}</dd>
          </div>
          <div>
            <dt>팔로워</dt>
            <dd>{followerLabel(creator.followerCount)}</dd>
          </div>
        </dl>
        <Link href={profilePath} className="creator-profile-link">
          작가 프로필 <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
      <div className="creator-world-works">
        {(creator.works?.length ?? 0) > 0 ? (
          creator.works?.map((work) => (
            <WorkPreview key={work.id} work={work} />
          ))
        ) : (
          <Link href={profilePath} className="creator-world-discover">
            <Film aria-hidden="true" />
            <strong>{creator.displayName}의 작품 세계</strong>
            <span>
              프로필에서 공개 작품 만나보기 <ArrowUpRight aria-hidden="true" />
            </span>
          </Link>
        )}
      </div>
    </article>
  )
}

export function CreatorDirectory({
  initialCreators,
  monthLabel = '이번 달',
  featuredHandles,
}: {
  readonly initialCreators: readonly CreatorDirectoryItem[]
  readonly monthLabel?: string
  readonly featuredHandles?: readonly string[] | undefined
}): ReactNode {
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('featured')
  const normalizedQuery = query
    .trim()
    .replace(/^@/u, '')
    .toLocaleLowerCase('ko-KR')
  const uniqueCreators = useMemo(
    () => [
      ...new Map(
        initialCreators.map((creator) => [creator.handle, creator]),
      ).values(),
    ],
    [initialCreators],
  )
  const creators = useMemo(() => {
    const filtered = uniqueCreators.filter((creator) =>
      `${creator.displayName} ${creator.handle} ${creator.bio ?? ''} ${creator.works?.map((work) => work.title).join(' ') ?? ''}`
        .toLocaleLowerCase('ko-KR')
        .includes(normalizedQuery),
    )
    if (sortMode === 'followers')
      return [...filtered].sort(
        (a, b) => (b.followerCount ?? -1) - (a.followerCount ?? -1),
      )
    if (sortMode === 'works')
      return [...filtered].sort((a, b) => b.seriesCount - a.seriesCount)
    return filtered
  }, [uniqueCreators, normalizedQuery, sortMode])
  const monthlyCreators = useMemo(
    () =>
      featuredHandles === undefined
        ? uniqueCreators.slice(0, 5)
        : [...new Set(featuredHandles)]
            .flatMap((handle) => {
              const creator = uniqueCreators.find(
                (item) => item.handle === handle,
              )
              return creator === undefined ? [] : [creator]
            })
            .slice(0, 5),
    [uniqueCreators, featuredHandles],
  )

  return (
    <div className="creator-directory">
      <header className="creator-best-heading">
        <div>
          <Link href="/browse" className="creator-home-link">
            <ArrowLeft aria-hidden="true" /> 홈으로
          </Link>
          <span className="creator-eyebrow">THE MONTHLY BEST</span>
          <h1 id="creator-monthly-title">
            이달의 작가 <em>BEST 5</em>
          </h1>
          <p>자신만의 시선으로 이야기를 만드는 작가들을 만나보세요.</p>
        </div>
        <div className="creator-best-month">
          <span>{monthLabel}</span>
          <Link href="/creator-apply">
            나도 크리에이터로 시작하기 <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </header>
      <section
        className="creator-monthly"
        aria-labelledby="creator-monthly-title"
      >
        <CalendlyCarousel
          items={monthlyCreators.map((creator) => ({
            id: creator.handle,
            stat: creator.displayName,
            quote: creatorBio(
              creator,
              '이야기를 만드는 작가의 시선을 만나보세요.',
            ),
            author: creator.displayName,
            role: `@${creator.handle} · 공개 작품 ${String(creator.seriesCount)}개`,
            defaultImage: creator.avatarUrl ?? '',
            selectedImage: creator.avatarUrl ?? '',
            alt: `${creator.displayName} 프로필 사진`,
            href: `/u/${encodeURIComponent(creator.handle)}`,
          }))}
          autoPlayInterval={6000}
          pauseOnHover
        />
      </section>
      <section
        className="creator-directory-list"
        id="creator-worlds"
        aria-labelledby="creator-worlds-title"
      >
        <header>
          <div>
            <span className="creator-eyebrow">INSIDE THEIR WORLDS</span>
            <h2 id="creator-worlds-title">
              {normalizedQuery === ''
                ? '작가들의 작품 세계'
                : '검색한 작가와 작품'}
            </h2>
            <p>작가의 개성과 이야기를 작품으로 만나보세요.</p>
          </div>
          <span aria-live="polite">{creators.length}명의 작가</span>
        </header>
        <div className="creator-directory-tools">
          <label className="creator-directory-search">
            <Search aria-hidden="true" />
            <span className="sr-only">작가와 작품 검색</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
              }}
              placeholder="이름, @아이디 또는 작품 검색"
            />
            {query === '' ? null : (
              <button
                type="button"
                aria-label="검색어 지우기"
                onClick={() => {
                  setQuery('')
                }}
              >
                <X aria-hidden="true" />
              </button>
            )}
          </label>
          <nav className="creator-sort" aria-label="작가 정렬">
            {sortOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={sortMode === option.value ? 'is-active' : ''}
                aria-pressed={sortMode === option.value}
                onClick={() => {
                  setSortMode(option.value)
                }}
              >
                {option.label}
              </button>
            ))}
          </nav>
        </div>
        {creators.length === 0 ? (
          <div className="creator-directory-empty">
            <Search aria-hidden="true" />
            <h3>
              {normalizedQuery === ''
                ? '첫 번째 작품 세계를 기다립니다.'
                : '검색 결과가 없습니다.'}
            </h3>
            <p>
              {normalizedQuery === ''
                ? '작품을 공개하고 당신만의 시선을 소개해 보세요.'
                : '다른 작가 이름이나 작품 제목으로 찾아보세요.'}
            </p>
            {normalizedQuery === '' ? (
              <Link href="/creator-apply">크리에이터로 시작하기</Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                }}
              >
                전체 작가 보기
              </button>
            )}
          </div>
        ) : (
          <div className="creator-directory-grid">
            {creators.map((creator) => (
              <CreatorWorld key={creator.handle} creator={creator} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
