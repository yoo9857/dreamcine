'use client'

import { ArrowUpRight, Film, Play, Search, X } from 'lucide-react'
import Link from 'next/link'
import React, { useMemo, useState, type ReactNode } from 'react'

import { CoverflowCarousel } from '@/components/ui/coverflow-carousel'

import { CreatorSeasonTag } from '@/src/components/user/CreatorSeasonTag'
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
      draggable={false}
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

function MonthlyCreatorCard({
  creator,
  index,
  active,
  onSelect,
  monthLabel,
}: {
  readonly creator: CreatorDirectoryItem
  readonly index: number
  readonly active: boolean
  readonly onSelect: () => void
  readonly monthLabel: string
}): ReactNode {
  const [coverFailed, setCoverFailed] = useState(false)
  const work = creator.works?.find((item) => item.posterUrl !== null)
  return (
    <div className={`creator-monthly-card${active ? ' is-spotlight' : ''}`}>
      <Link
        href={`/u/${encodeURIComponent(creator.handle)}`}
        className="creator-monthly-profile"
        aria-label={`${creator.displayName} 작가 프로필 보기`}
        tabIndex={active ? 0 : -1}
        aria-hidden={!active}
      >
        <div className="creator-monthly-cover">
          {work?.posterUrl === undefined || coverFailed ? null : (
            <img
              src={work.posterUrl ?? ''}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => {
                setCoverFailed(true)
              }}
            />
          )}
          <span className="creator-monthly-number">
            {String(index + 1).padStart(2, '0')}
          </span>
          <CreatorSeasonTag
            monthLabel={monthLabel}
            className="creator-monthly-season-tag"
          />
          <span className="creator-monthly-avatar">
            <CreatorPortrait creator={creator} />
          </span>
        </div>
        <div className="creator-monthly-body">
          <div className="creator-monthly-identity">
            <h3>{creator.displayName}</h3>
            <span className="creator-monthly-handle">@{creator.handle}</span>
          </div>
          <p>{creatorBio(creator, '작품으로 전하는 나만의 이야기.')}</p>
          <div className="creator-monthly-card-footer">
            <span>
              공개 작품 <strong>{creator.seriesCount}</strong>
            </span>
            <span className="creator-monthly-visit">
              프로필 <ArrowUpRight aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
      {active ? null : (
        <button
          className="creator-monthly-select"
          type="button"
          aria-label={`${creator.displayName} 강조 보기`}
          onClick={onSelect}
        />
      )}
    </div>
  )
}

function MonthlyCreators({
  creators,
  monthLabel,
}: {
  readonly creators: readonly CreatorDirectoryItem[]
  readonly monthLabel: string
}): ReactNode {
  const slides = useMemo(
    () =>
      creators.map((creator) => ({
        src: creator.avatarUrl ?? '',
        alt: creator.displayName,
        title: creator.displayName,
        subtitle: `@${creator.handle}`,
      })),
    [creators],
  )
  return (
    <section
      className="creator-monthly"
      aria-labelledby="creator-monthly-title"
    >
      <div className="creator-monthly-toolbar">
        <span>
          <span className="creator-monthly-dot" />
          {monthLabel} · 이달의 선정 작가
        </span>
        <span className="creator-monthly-count">
          {creators.length}명의 시선
        </span>
      </div>
      {creators.length === 0 ? (
        <p className="creator-monthly-empty">
          이달의 작가를 준비하고 있습니다. 아래에서 작가와 작품을 만나보세요.
        </p>
      ) : (
        <CoverflowCarousel
          slides={slides}
          label="이달의 작가 입체 슬라이드"
          className="creator-monthly-coverflow"
          cardWidth="clamp(210px, 18cqw, 220px)"
          cardHeight="296px"
          cardClassName="creator-monthly-slide"
          rotate={30}
          depth={0.3}
          perspective={5}
          falloff={0.6}
          fade={0.03}
          gap={0.07}
          initialIndex={Math.floor(creators.length / 2)}
          autoPlayInterval={6000}
          showNavigation
          showPagination
          navigationLabels={{
            previous: '이전 작가 보기',
            next: '다음 작가 보기',
            pause: '자동 전환 일시정지',
            play: '자동 전환 시작',
            select: (slide) => `${slide.title ?? ''} 선택`,
          }}
          renderSlide={(_, index, active, onSelect) => {
            const creator = creators[index]
            return creator === undefined ? null : (
              <MonthlyCreatorCard
                creator={creator}
                index={index}
                active={active}
                onSelect={onSelect}
                monthLabel={monthLabel}
              />
            )
          }}
        />
      )}
    </section>
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
        : [
            ...new Set([
              ...featuredHandles,
              ...uniqueCreators.map((creator) => creator.handle),
            ]),
          ]
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
        <h1 id="creator-monthly-title" className="sr-only">
          이달의 작가
        </h1>
        <div className="creator-best-month">
          <CreatorSeasonTag monthLabel={monthLabel} />
          <p>
            이달의 크리에이터에게{' '}
            <Link href="/creators/season-tags">시즌 태그</Link>가 부여됩니다.
          </p>
        </div>
      </header>
      <MonthlyCreators creators={monthlyCreators} monthLabel={monthLabel} />
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
