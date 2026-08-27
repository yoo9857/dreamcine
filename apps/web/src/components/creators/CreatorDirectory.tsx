'use client'

import { ArrowUpRight, Search, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import React, { useMemo, useState, type ReactNode } from 'react'

import type { CreatorDirectoryItem } from '@/src/services/user/get-featured-creators'

type SortMode = 'featured' | 'followers' | 'works'

const sortOptions: readonly { value: SortMode; label: string }[] = [
  { value: 'featured', label: 'ALL CREATORS' },
  { value: 'followers', label: 'MOST FOLLOWED' },
  { value: 'works', label: 'MOST WORKS' },
]

function compactNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function CreatorPortrait({
  creator,
}: {
  readonly creator: CreatorDirectoryItem
}): ReactNode {
  return creator.avatarUrl === null ? (
    <span className="creator-avatar-fallback" aria-hidden="true">
      {creator.displayName.trim().slice(0, 1).toUpperCase()}
    </span>
  ) : (
    <img src={creator.avatarUrl} alt="" />
  )
}

function CreatorCard({
  creator,
}: {
  readonly creator: CreatorDirectoryItem
}): ReactNode {
  return (
    <article className="creator-directory-card">
      <Link href={`/u/${encodeURIComponent(creator.handle)}`}>
        <div className="creator-card-portrait">
          <CreatorPortrait creator={creator} />
          <span className="creator-card-open" aria-hidden="true">
            <ArrowUpRight />
          </span>
        </div>
        <div className="creator-card-copy">
          <div>
            <h3>{creator.displayName}</h3>
            <span>@{creator.handle}</span>
          </div>
          <p>
            {creator.bio ?? '새로운 이야기를 만드는 ilog 크리에이터입니다.'}
          </p>
          <dl>
            <div>
              <dt>FOLLOWERS</dt>
              <dd>{compactNumber(creator.followerCount)}</dd>
            </div>
            <div>
              <dt>WORKS</dt>
              <dd>{creator.seriesCount}</dd>
            </div>
          </dl>
        </div>
      </Link>
    </article>
  )
}

function MonthlyCreatorCard({
  creator,
  duplicate = false,
}: {
  readonly creator: CreatorDirectoryItem
  readonly duplicate?: boolean
}): ReactNode {
  return (
    <Link
      href={`/u/${encodeURIComponent(creator.handle)}`}
      className="creator-monthly-card"
      tabIndex={duplicate ? -1 : undefined}
      aria-hidden={duplicate ? true : undefined}
    >
      <div className="creator-monthly-portrait">
        <CreatorPortrait creator={creator} />
      </div>
      <div className="creator-monthly-copy">
        <span>
          <Sparkles aria-hidden="true" /> ILOG CURATED
        </span>
        <h3>{creator.displayName}</h3>
        <strong>@{creator.handle}</strong>
        <p>{creator.bio ?? '새로운 이야기를 만드는 ilog 크리에이터입니다.'}</p>
        <dl>
          <div>
            <dt>FOLLOWERS</dt>
            <dd>{compactNumber(creator.followerCount)}</dd>
          </div>
          <div>
            <dt>WORKS</dt>
            <dd>{creator.seriesCount}</dd>
          </div>
          <div>
            <dt>ACHIEVEMENT</dt>
            <dd>EDITOR&apos;S PICK</dd>
          </div>
        </dl>
      </div>
      <span className="creator-monthly-open" aria-hidden="true">
        <ArrowUpRight />
      </span>
    </Link>
  )
}

export function CreatorDirectory({
  initialCreators,
}: {
  readonly initialCreators: readonly CreatorDirectoryItem[]
}): ReactNode {
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('featured')
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
  const creators = useMemo(() => {
    const filtered = initialCreators.filter((creator) => {
      if (normalizedQuery === '') return true
      return `${creator.displayName} ${creator.handle} ${creator.bio ?? ''}`
        .toLocaleLowerCase('ko-KR')
        .includes(normalizedQuery)
    })
    if (sortMode === 'followers') {
      return [...filtered].sort((a, b) => b.followerCount - a.followerCount)
    }
    if (sortMode === 'works') {
      return [...filtered].sort((a, b) => b.seriesCount - a.seriesCount)
    }
    return filtered
  }, [initialCreators, normalizedQuery, sortMode])
  const monthlyCreators = useMemo(
    () => initialCreators.slice(0, 5),
    [initialCreators],
  )
  const monthlyHandles = useMemo(
    () => new Set(monthlyCreators.map((creator) => creator.handle)),
    [monthlyCreators],
  )
  const visibleCreators =
    normalizedQuery === ''
      ? creators.filter((creator) => !monthlyHandles.has(creator.handle))
      : creators

  return (
    <main className="creator-directory">
      <header className="creator-directory-hero">
        <div className="creator-directory-heading">
          <span>CREATOR DIRECTORY</span>
          <h1>작가</h1>
          <p>이야기 뒤의 시선을 발견하고, 다음 작품을 먼저 만나보세요.</p>
        </div>
        <div className="creator-directory-tools">
          <label className="creator-directory-search">
            <Search aria-hidden="true" />
            <span className="sr-only">작가 검색</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
              }}
              placeholder="이름 또는 @아이디 검색"
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
      </header>

      {normalizedQuery !== '' || monthlyCreators.length === 0 ? null : (
        <section
          className="creator-monthly"
          aria-labelledby="creator-monthly-title"
        >
          <header>
            <div>
              <span>MONTHLY SELECTION</span>
              <h2 id="creator-monthly-title">이달의 작가</h2>
            </div>
            <p>새로운 장면을 만드는 다섯 개의 시선을 만나보세요.</p>
          </header>
          <div className="creator-monthly-grid">
            <div className="creator-monthly-track">
              {[false, true].map((duplicate) => (
                <div
                  className="creator-monthly-group"
                  aria-hidden={duplicate ? true : undefined}
                  key={duplicate ? 'copy' : 'original'}
                >
                  {monthlyCreators.map((creator) => (
                    <MonthlyCreatorCard
                      creator={creator}
                      duplicate={duplicate}
                      key={creator.handle}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="creator-directory-list" aria-live="polite">
        <header>
          <div>
            <span className="creator-section-mark" aria-hidden="true">
              CR
            </span>
            <div>
              <h2>
                {normalizedQuery === '' ? 'EXPLORE CREATORS' : 'SEARCH RESULTS'}
              </h2>
              <p>프로필을 선택하면 작품과 작가의 이야기를 볼 수 있습니다.</p>
            </div>
          </div>
          <span>{visibleCreators.length} CREATORS</span>
        </header>

        {visibleCreators.length === 0 ? (
          <div className="creator-directory-empty">
            <Search aria-hidden="true" />
            <h3>일치하는 작가가 없습니다.</h3>
            <p>이름이나 아이디를 다르게 입력해 보세요.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
              }}
            >
              전체 작가 보기
            </button>
          </div>
        ) : (
          <div className="creator-directory-grid">
            {visibleCreators.map((creator) => (
              <CreatorCard creator={creator} key={creator.handle} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
