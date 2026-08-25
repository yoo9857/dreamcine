'use client'

import { SearchResultSchema, type SearchResult } from '@aidream/core'
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Spinner,
} from '@aidream/ui'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState, type ReactNode, type SyntheticEvent } from 'react'
import { z } from 'zod'

const SearchPageSchema = z.object({
  items: z.array(SearchResultSchema),
  nextCursor: z.string().nullable(),
})

export function SearchResults({
  initialQuery = '',
}: {
  readonly initialQuery?: string
}): ReactNode {
  const [input, setInput] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery)
  const [type, setType] = useState<'series' | 'episode' | 'user'>('episode')
  const result = useQuery({
    queryKey: ['search', type, query],
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const params = new URLSearchParams({ q: query.trim(), type, limit: '20' })
      const response = await fetch(`/api/search?${params.toString()}`, {
        credentials: 'same-origin',
      })
      if (!response.ok)
        throw new Error(`search failed: ${String(response.status)}`)
      return SearchPageSchema.parse(await response.json())
    },
  })
  const submit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault()
    setQuery(input)
  }

  return (
    <section className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <Input
          label="검색어"
          value={input}
          onChange={(event) => {
            setInput(event.target.value)
          }}
          minLength={2}
          maxLength={50}
          required
        />
        <Select
          label="검색 대상"
          value={type}
          onValueChange={(value) => {
            setType(value as typeof type)
          }}
          options={[
            { value: 'episode', label: '에피소드' },
            { value: 'series', label: '시리즈' },
            { value: 'user', label: '사용자' },
          ]}
        />
        <Button type="submit">검색</Button>
      </form>
      {query.trim().length < 2 ? (
        <EmptyState title="두 글자 이상 입력해 주세요" />
      ) : null}
      {result.isPending && query.trim().length >= 2 ? (
        <div className="flex justify-center py-12">
          <Spinner label="검색 중" />
        </div>
      ) : null}
      {result.isError ? (
        <ErrorState
          description="검색 결과를 불러오지 못했습니다."
          onRetry={() => void result.refetch()}
        />
      ) : null}
      {result.data?.items.length === 0 ? (
        <EmptyState
          title="검색 결과가 없습니다"
          description="다른 검색어를 입력해 보세요."
        />
      ) : null}
      {result.data === undefined ? null : (
        <SearchItems items={result.data.items} />
      )}
    </section>
  )
}

function SearchItems({
  items,
}: {
  readonly items: readonly SearchResult[]
}): ReactNode {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => {
        if (item.type === 'episode')
          return (
            <Link
              key={`episode:${item.episode.episodeId}`}
              href={`/watch/${item.episode.episodeId}`}
              className="rounded-lg border border-border p-4"
            >
              {item.episode.title}
            </Link>
          )
        if (item.type === 'series')
          return (
            <Link
              key={`series:${item.id}`}
              href={`/series/${item.id}`}
              className="rounded-lg border border-border p-4"
            >
              {item.title}
            </Link>
          )
        return (
          <div
            key={`user:${item.handle}`}
            className="rounded-lg border border-border p-4"
          >
            @{item.handle} · {item.displayName}
          </div>
        )
      })}
    </div>
  )
}
