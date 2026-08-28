'use client'

import type { SeriesResponse, WorkType } from '@aidream/core'
import { CheckCircle2, Film, Search, Settings2 } from 'lucide-react'
import Link from 'next/link'
import React, { useMemo, useState, type ReactNode } from 'react'

import { WORK_TYPE_OPTIONS, workTypeLabel } from './work-types'

type Filter = 'ALL' | 'ACTIVE' | 'EMPTY' | 'COMPLETED'
type WorkTypeFilter = 'ALL' | WorkType
type Sort = 'UPDATED' | 'VIEWS' | 'TITLE'

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

function compareViews(left: SeriesResponse, right: SeriesResponse): number {
  const leftViews = BigInt(left.totalViews)
  const rightViews = BigInt(right.totalViews)
  if (leftViews === rightViews) return 0
  return leftViews > rightViews ? -1 : 1
}

export function StudioSeriesTable({
  series,
  advanced = false,
}: {
  readonly series: readonly SeriesResponse[]
  readonly advanced?: boolean
}): ReactNode {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [workType, setWorkType] = useState<WorkTypeFilter>('ALL')
  const [sort, setSort] = useState<Sort>('UPDATED')
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    const filtered = series.filter(
      (item) =>
        (filter === 'ALL' || seriesState(item) === filter) &&
        (workType === 'ALL' || item.workType === workType) &&
        (normalized === '' ||
          item.title.toLocaleLowerCase('ko-KR').includes(normalized) ||
          (item.synopsis ?? '')
            .toLocaleLowerCase('ko-KR')
            .includes(normalized)),
    )

    return [...filtered].sort((left, right) => {
      if (sort === 'VIEWS') return compareViews(left, right)
      if (sort === 'TITLE')
        return left.title.localeCompare(right.title, 'ko-KR')
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
    })
  }, [filter, query, series, sort, workType])

  return (
    <div className="studio-content-panel">
      <div className="studio-content-toolbar">
        <label className="studio-search-field">
          <Search aria-hidden="true" />
          <span className="sr-only">작품 검색</span>
          <input
            type="search"
            value={query}
            placeholder="제목 또는 작품 소개 검색"
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

      {advanced ? (
        <div className="studio-library-controls">
          <label>
            <span>포맷</span>
            <select
              value={workType}
              onChange={(event) => {
                setWorkType(event.currentTarget.value as WorkTypeFilter)
              }}
            >
              <option value="ALL">모든 포맷</option>
              {WORK_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>정렬</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.currentTarget.value as Sort)
              }}
            >
              <option value="UPDATED">최근 수정순</option>
              <option value="VIEWS">조회수순</option>
              <option value="TITLE">제목순</option>
            </select>
          </label>
          <strong>{visible.length}개 작품</strong>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="studio-table-empty">
          <Film aria-hidden="true" />
          <strong>조건에 맞는 작품이 없습니다</strong>
          <p>검색어나 상태·포맷 필터를 변경해 보세요.</p>
        </div>
      ) : (
        <div className="studio-table-scroll">
          <table className="studio-content-table">
            <thead>
              <tr>
                <th>작품</th>
                <th>상태</th>
                <th>영상·회차</th>
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
                            {item.synopsis ?? '등록된 작품 소개가 없습니다.'}
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
