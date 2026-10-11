'use client'

import { SearchResultSchema, type SearchResult } from '@aidream/core'
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
  Tabs,
} from '@aidream/ui'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ArrowRight, Clapperboard, Compass, Search, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import React, {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import { z } from 'zod'

import type { SessionUser } from '@/src/auth/types'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { QueryProvider } from '@/src/components/QueryProvider'
import { DiscoveryTopbar } from '@/src/components/discovery/DiscoveryTopbar'
import { UserTierLine } from '@/src/components/user/UserTierLine'
import { higgsfieldWorkCard } from '@/src/content/higgsfield'
import { EpisodeCard } from './EpisodeCard'

const SearchPageSchema = z.object({
  items: z.array(SearchResultSchema),
  nextCursor: z.string().nullable(),
})
const categories = [
  { value: 'episode', label: '영상' },
  { value: 'series', label: '시리즈' },
  { value: 'user', label: '크리에이터' },
] as const

export function SearchResults({
  user,
}: {
  readonly user: SessionUser | null
}): ReactNode {
  return (
    <QueryProvider>
      <SearchResultsContent user={user} />
    </QueryProvider>
  )
}

function SearchResultsContent({
  user,
}: {
  readonly user: SessionUser | null
}): ReactNode {
  const params = useSearchParams()
  const query = (params.get('q') ?? '').trim()
  const rawType = params.get('type')
  const type = rawType === 'series' || rawType === 'user' ? rawType : 'episode'
  const [input, setInput] = useState(query)
  const inputRef = useRef<HTMLInputElement>(null)
  const valid = query.length >= 2 && query.length <= 50
  useEffect(() => {
    setInput(query)
  }, [query])

  // Next observes native history: searches preserve cached categories and
  // back/forward restores both the query and the selected category.
  const navigate = (value: string, category: string = type): void => {
    const next = new URLSearchParams()
    if (value.trim()) next.set('q', value.trim())
    next.set('type', category)
    window.history.pushState(null, '', `/search?${next.toString()}`)
  }
  const result = useInfiniteQuery({
    queryKey: ['search', type, query],
    enabled: valid,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const search = new URLSearchParams({ q: query, type, limit: '20' })
      if (pageParam !== null) search.set('cursor', pageParam)
      const response = await fetch(`/api/search?${search.toString()}`, {
        credentials: 'same-origin',
        signal,
      })
      if (!response.ok)
        throw new Error(`search failed: ${String(response.status)}`)
      return SearchPageSchema.parse(await response.json())
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
  const items = result.data?.pages.flatMap((page) => page.items) ?? []
  const label =
    categories.find((category) => category.value === type)?.label ?? '영상'
  const submit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const value = input.trim()
    if (value.length < 2 || value.length > 50) {
      inputRef.current?.setCustomValidity('검색어를 2~50자로 입력해 주세요.')
      inputRef.current?.reportValidity()
      return
    }
    navigate(value)
  }
  const content = (
    <section
      aria-label={`${label} 검색 결과`}
      aria-busy={valid && result.isFetching}
      className="search-results"
    >
      <div className="search-results-heading">
        <h2>
          {valid ? (
            <>
              <span>“{query}”</span> 검색 결과
            </>
          ) : (
            '새로운 이야기를 찾아보세요'
          )}
        </h2>
        <p role="status" aria-live="polite">
          {valid && result.isSuccess
            ? `${label} ${String(items.length)}개${result.hasNextPage ? ' 이상' : ''}`
            : '작품과 크리에이터를 한곳에서 발견하세요.'}
        </p>
      </div>
      {!valid ? (
        <div className="search-empty">
          <Search aria-hidden="true" />
          <EmptyState
            title={
              query
                ? '검색어를 2~50자로 입력해 주세요'
                : '어떤 이야기를 찾고 있나요?'
            }
            description="영상 제목, 시리즈 이름 또는 크리에이터 이름을 입력해 보세요."
          />
          <Link href="/works" className="search-explore">
            <Compass aria-hidden="true" /> 작품 둘러보기{' '}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      ) : null}
      {valid && result.isPending ? (
        <>
          <p className="sr-only" role="status">
            검색 중
          </p>
          <div className={`search-grid search-grid-${type}`} aria-hidden="true">
            {Array.from({ length: 6 }, (_unused, index) => (
              <div className="search-loading-row" key={index}>
                <Skeleton className="search-loading-thumb" />
                <div>
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {valid && result.isError && items.length === 0 ? (
        <div className="search-empty">
          <ErrorState
            description="검색 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
            onRetry={() => void result.refetch()}
          />
        </div>
      ) : null}
      {valid && result.isSuccess && items.length === 0 ? (
        <div className="search-empty">
          <Search aria-hidden="true" />
          <EmptyState
            title="검색 결과가 없습니다"
            description="검색어의 철자를 확인하거나 다른 검색 대상에서 찾아보세요."
          />
          <Link href="/works" className="search-explore">
            작품 둘러보기 <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      ) : null}
      {valid && items.length > 0 ? (
        <SearchItems items={items} type={type} />
      ) : null}
      {valid &&
      result.isError &&
      items.length > 0 &&
      !result.isFetchNextPageError ? (
        <ErrorState
          description="검색 결과를 새로 불러오지 못했습니다."
          onRetry={() => void result.refetch()}
        />
      ) : null}
      {valid && result.hasNextPage ? (
        <div className="search-pagination">
          {result.isFetchNextPageError ? (
            <p role="alert">
              다음 결과를 불러오지 못했습니다. 다시 시도해 주세요.
            </p>
          ) : null}
          <Button
            variant="secondary"
            loading={result.isFetchingNextPage}
            disabled={result.isFetching}
            onClick={() => void result.fetchNextPage()}
          >
            {result.isFetchNextPageError
              ? '다시 불러오기'
              : '검색 결과 더 보기'}
          </Button>
        </div>
      ) : null}
    </section>
  )

  return (
    <>
      <DiscoveryTopbar
        user={user}
        search={
          <form
            role="search"
            className="discovery-search search-form"
            onSubmit={submit}
          >
            <Search aria-hidden="true" />
            <label htmlFor="search-query" className="sr-only">
              검색어
            </label>
            <input
              ref={inputRef}
              id="search-query"
              type="search"
              name="q"
              value={input}
              minLength={2}
              maxLength={50}
              required
              placeholder="영상, 시리즈, 크리에이터 검색"
              onChange={(event) => {
                event.target.setCustomValidity('')
                setInput(event.target.value)
              }}
            />
            {input ? (
              <button
                type="button"
                className="search-clear"
                aria-label="검색어 지우기"
                onClick={() => {
                  setInput('')
                  inputRef.current?.setCustomValidity('')
                  inputRef.current?.focus()
                }}
              >
                <X aria-hidden="true" />
              </button>
            ) : null}
            <LiquidMetalButton
              type="submit"
              label="검색"
              className="discovery-search-liquid search-submit"
            />
          </form>
        }
      />
      <h1 className="sr-only">검색</h1>
      <Tabs
        label="검색 대상"
        value={type}
        onValueChange={(value) => {
          navigate(query, value)
        }}
        className="search-tabs"
        items={categories.map((category) => ({ ...category, content }))}
      />
    </>
  )
}

function SearchItems({
  items,
  type,
}: {
  readonly items: readonly SearchResult[]
  readonly type: string
}): ReactNode {
  return (
    <div className={`search-grid search-grid-${type}`}>
      {items.map((item) => {
        if (item.type === 'episode')
          return (
            <EpisodeCard
              key={`episode:${item.episode.episodeId}`}
              item={item.episode}
            />
          )
        if (item.type === 'series') {
          const partner = higgsfieldWorkCard(item.id)
          return (
            <article key={`series:${item.id}`} className="search-series-card">
              <Link href={partner?.href ?? `/series/${item.id}`}>
                <div className="search-series-visual">
                  {item.posterUrl === null ? (
                    <div className="search-poster-placeholder">
                      <Clapperboard aria-hidden="true" />
                      <span>포스터 준비 중</span>
                    </div>
                  ) : (
                    <Image
                      src={item.posterUrl}
                      alt={`${item.title} 포스터`}
                      fill
                      sizes="(max-width: 560px) 50vw, (max-width: 1024px) 33vw, 240px"
                      unoptimized
                    />
                  )}
                  <span className="search-card-label">
                    {partner ? '영화' : '시리즈'}
                  </span>
                </div>
                <div className="search-series-copy">
                  <h2>{item.title}</h2>
                  <UserTierLine user={item.creator} link={false} compact />
                  {partner ? <p>{partner.meta}</p> : null}
                </div>
              </Link>
            </article>
          )
        }
        return (
          <Link
            key={`user:${item.handle}`}
            href={`/u/${encodeURIComponent(item.handle)}`}
            className="search-creator-card"
          >
            <Avatar name={item.displayName} src={item.avatarUrl} size="lg" />
            <div>
              <h2>{item.displayName}</h2>
              <p>@{item.handle}</p>
              <span>팔로워 {item.followerCount.toLocaleString('ko-KR')}명</span>
            </div>
            <ArrowRight aria-hidden="true" />
          </Link>
        )
      })}
    </div>
  )
}
