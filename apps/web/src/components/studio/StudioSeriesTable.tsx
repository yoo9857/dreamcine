'use client'

import type { SeriesResponse } from '@aidream/core'
import { CheckCircle2, Film, Search, Settings2 } from 'lucide-react'
import Link from 'next/link'
import React, { useMemo, useState, type ReactNode } from 'react'

import { workTypeLabel } from './work-types'

type Filter = 'ALL' | 'ACTIVE' | 'EMPTY' | 'COMPLETED'

function formatCount(value: string | number): string {
  try {
    return new Intl.NumberFormat('ko-KR', { notation: 'compact' }).format(
      typeof value === 'string' ? BigInt(value) : value,
    )
  } catch {
    return String(value)
  }
}

function seriesState(series: SeriesResponse): Exclude<Filter, 'ALL'> {
  if (series.isCompleted) return 'COMPLETED'
  return series.episodeCount === 0 ? 'EMPTY' : 'ACTIVE'
}

const FILTERS: readonly { label: string; value: Filter }[] = [
  { label: '전체', value: 'ALL' },
  { label: '운영 중', value: 'ACTIVE' },
  { label: '준비 중', value: 'EMPTY' },
  { label: '완결', value: 'COMPLETED' },
]

export function StudioSeriesTable({
  series,
}: {
  readonly series: readonly SeriesResponse[]
}): ReactNode {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    return series.filter(
      (item) =>
        (filter === 'ALL' || seriesState(item) === filter) &&
        (normalized === '' ||
          item.title.toLocaleLowerCase('ko-KR').includes(normalized)),
    )
  }, [filter, query, series])

  return (
    <div className="studio-content-panel">
      <div className="studio-content-toolbar">
        <label className="studio-search-field">
          <Search aria-hidden="true" />
          <span className="sr-only">작품 검색</span>
          <input
            type="search"
            value={query}
            placeholder="작품(시리즈) 검색"
            onChange={(event) => {
              setQuery(event.currentTarget.value)
            }}
          />
        </label>
        <div className="studio-filter-group" aria-label="콘텐츠 상태 필터">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => {
                setFilter(item.value)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="studio-table-empty">
          <Film aria-hidden="true" />
          <strong>조건에 맞는 작품이 없습니다</strong>
          <p>검색어나 상태 필터를 변경해 보세요.</p>
        </div>
      ) : (
        <div className="studio-table-scroll">
          <table className="studio-content-table">
            <thead>
              <tr>
                <th>작품(시리즈)</th>
                <th>상태</th>
                <th>회차</th>
                <th>누적 조회수</th>
                <th>최근 수정</th>
                <th>
                  <span className="sr-only">관리</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const state = seriesState(item)
                return (
                  <tr key={item.id}>
                    <td>
                      <Link
                        href={`/studio/series/${item.id}`}
                        className="studio-content-title"
                      >
                        <span className="studio-series-poster">
                          {item.posterUrl === undefined ? (
                            <Film aria-hidden="true" />
                          ) : (
                            <img src={item.posterUrl} alt="" />
                          )}
                        </span>
                        <span>
                          <em className="studio-work-type">
                            {workTypeLabel(item.workType)}
                          </em>
                          <strong>{item.title}</strong>
                          <small>
                            {item.synopsis ?? '작품 소개가 없습니다.'}
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="studio-status" data-status={state}>
                        {state === 'COMPLETED' ? (
                          <CheckCircle2 aria-hidden="true" />
                        ) : null}
                        {state === 'ACTIVE'
                          ? '운영 중'
                          : state === 'EMPTY'
                            ? '준비 중'
                            : '완결'}
                      </span>
                    </td>
                    <td>{formatCount(item.episodeCount)}</td>
                    <td>{formatCount(item.totalViews)}</td>
                    <td>
                      {new Intl.DateTimeFormat('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      }).format(new Date(item.updatedAt))}
                    </td>
                    <td>
                      <Link
                        href={`/studio/series/${item.id}`}
                        className="studio-manage-link"
                        aria-label={`${item.title} 관리`}
                      >
                        <Settings2 aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
