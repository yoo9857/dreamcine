'use client'

import { BarChart3, Clock3, Eye, Search, Users } from 'lucide-react'
import Link from 'next/link'
import React, { useMemo, useState, type ReactNode } from 'react'

import type {
  StudioEpisodeAnalytics,
  StudioSeriesAnalytics,
} from '@/src/services/studio/get-studio-dashboard'

type Sort = 'VIEWS' | 'WATCH' | 'ENGAGEMENT' | 'EPISODE'

function compact(value: string | number): string {
  return new Intl.NumberFormat('ko-KR', { notation: 'compact' }).format(
    typeof value === 'string' ? BigInt(value) : value,
  )
}

function percent(numerator: number, denominator: number | bigint): string {
  const divisor =
    typeof denominator === 'bigint' ? Number(denominator) : denominator
  if (divisor <= 0) return '—'
  return `${String(Math.min(999, Math.round((numerator / divisor) * 100)))}%`
}

function watchHours(episode: StudioEpisodeAnalytics): number {
  return (
    Number((BigInt(episode.viewCount) * BigInt(episode.avgWatchSec)) / 360n) /
    10
  )
}

function engagement(episode: StudioEpisodeAnalytics): number {
  const views = Number(BigInt(episode.viewCount))
  return views === 0
    ? 0
    : (episode.likeCount + episode.commentCount + episode.shareCount) / views
}

export function SeriesPerformancePanel({
  analytics,
}: {
  readonly analytics: StudioSeriesAnalytics
}): ReactNode {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('VIEWS')
  const episodes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    return [...analytics.episodes]
      .filter(
        (episode) =>
          normalized === '' ||
          episode.title.toLocaleLowerCase('ko-KR').includes(normalized),
      )
      .sort((left, right) => {
        if (sort === 'EPISODE') {
          return (
            (left.seasonNumber ?? 1) - (right.seasonNumber ?? 1) ||
            left.number - right.number
          )
        }
        if (sort === 'WATCH') return watchHours(right) - watchHours(left)
        if (sort === 'ENGAGEMENT') return engagement(right) - engagement(left)
        return Number(BigInt(right.viewCount) - BigInt(left.viewCount))
      })
  }, [analytics.episodes, query, sort])
  const totalWatchHours = Number(BigInt(analytics.totals.watchSeconds)) / 3600
  const interactions =
    analytics.totals.likes + analytics.totals.comments + analytics.totals.shares

  return (
    <div className="studio-performance-panel">
      <div className="studio-performance-kpis">
        <article>
          <Eye aria-hidden="true" />
          <span>누적 조회수</span>
          <strong>{compact(analytics.totals.views)}</strong>
          <small>전체 상태 콘텐츠 합계</small>
        </article>
        <article>
          <Clock3 aria-hidden="true" />
          <span>추정 시청 시간</span>
          <strong>
            {totalWatchHours.toLocaleString('ko-KR', {
              maximumFractionDigits: 1,
            })}
            시간
          </strong>
          <small>조회수 × 평균 시청시간</small>
        </article>
        <article>
          <Users aria-hidden="true" />
          <span>기록된 시청자</span>
          <strong>{compact(analytics.totals.uniqueViewers)}</strong>
          <small>로그인·진행 저장 사용자</small>
        </article>
        <article>
          <BarChart3 aria-hidden="true" />
          <span>참여율</span>
          <strong>
            {percent(interactions, BigInt(analytics.totals.views))}
          </strong>
          <small>좋아요·댓글·공유 / 조회</small>
        </article>
      </div>

      <div className="studio-performance-toolbar">
        <label>
          <Search aria-hidden="true" />
          <span className="sr-only">에피소드 검색</span>
          <input
            type="search"
            value={query}
            placeholder="에피소드 검색"
            onChange={(event) => {
              setQuery(event.currentTarget.value)
            }}
          />
        </label>
        <label>
          <span>정렬</span>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.currentTarget.value as Sort)
            }}
          >
            <option value="VIEWS">조회수 높은 순</option>
            <option value="WATCH">시청 시간 높은 순</option>
            <option value="ENGAGEMENT">참여율 높은 순</option>
            <option value="EPISODE">회차 순</option>
          </select>
        </label>
      </div>

      {episodes.length === 0 ? (
        <div className="studio-performance-empty">
          <BarChart3 aria-hidden="true" />
          <strong>
            {analytics.episodes.length === 0
              ? '분석할 에피소드가 없습니다'
              : '검색 결과가 없습니다'}
          </strong>
          <p>
            {analytics.episodes.length === 0
              ? '첫 에피소드를 연결하면 콘텐츠 데이터가 이곳에 표시됩니다.'
              : '다른 제목으로 검색해 보세요.'}
          </p>
        </div>
      ) : (
        <div className="studio-table-scroll">
          <table className="studio-performance-table">
            <thead>
              <tr>
                <th>콘텐츠</th>
                <th>노출 / 조회</th>
                <th>평균 시청</th>
                <th>참여</th>
                <th>완주</th>
                <th>상세</th>
              </tr>
            </thead>
            <tbody>
              {episodes.map((episode) => (
                <tr key={episode.id}>
                  <td>
                    <span className="studio-performance-title">
                      <span>
                        {episode.thumbUrl === null ? null : (
                          <img src={episode.thumbUrl} alt="" />
                        )}
                      </span>
                      <span>
                        <strong>{episode.title}</strong>
                        <small>
                          {episode.seasonNumber === null
                            ? ''
                            : `시즌 ${String(episode.seasonNumber)} · `}
                          {episode.number}화 · {episode.status}
                        </small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <strong>{compact(episode.impressionCount)}</strong>
                    <small>
                      조회 {compact(episode.viewCount)} · 전환{' '}
                      {percent(
                        Number(BigInt(episode.viewCount)),
                        BigInt(episode.impressionCount),
                      )}
                    </small>
                  </td>
                  <td>
                    <strong>{episode.avgWatchSec}초</strong>
                    <small>
                      평균 시청률{' '}
                      {episode.durationSec === null
                        ? '—'
                        : percent(episode.avgWatchSec, episode.durationSec)}
                    </small>
                  </td>
                  <td>
                    <strong>
                      {percent(
                        episode.likeCount +
                          episode.commentCount +
                          episode.shareCount,
                        BigInt(episode.viewCount),
                      )}
                    </strong>
                    <small>
                      좋아요 {compact(episode.likeCount)} · 댓글{' '}
                      {compact(episode.commentCount)}
                    </small>
                  </td>
                  <td>
                    <strong>
                      {percent(episode.completedViewers, episode.uniqueViewers)}
                    </strong>
                    <small>
                      기록 사용자 {compact(episode.uniqueViewers)}명
                    </small>
                  </td>
                  <td>
                    <Link
                      href={`/studio/series/${analytics.series.id}/episodes/${episode.id}`}
                    >
                      데이터 보기
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="studio-analytics-scope">
        완주율과 기록된 시청자는 로그인 상태에서 재생 진행이 저장된 사용자만
        포함합니다. 일별 추이·유입 경로·기기·구간별 이탈은 이벤트 원장 구축 후
        제공됩니다.
      </p>
    </div>
  )
}
