'use client'

import type {
  EpisodeResponse,
  PublishEpisodeResponse,
  WorkType,
} from '@aidream/core'
import { Button, EmptyState } from '@aidream/ui'
import {
  BarChart3,
  CalendarClock,
  ChevronDown,
  Clapperboard,
  Edit3,
  Eye,
  EyeOff,
  Globe2,
  Heart,
  MessageCircle,
  Search,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState, type ReactNode } from 'react'

import { readApiError } from '@/src/lib/error-messages'
import type {
  StudioAssetOption,
  StudioEpisodeAnalytics,
} from '@/src/services/studio/get-studio-dashboard'

import { EditEpisodeForm } from './EditEpisodeForm'
import { openEpisodeCreator } from './episode-create-events'

const STATUS = {
  DRAFT: { label: '초안', icon: Clapperboard },
  SCHEDULED: { label: '예약', icon: CalendarClock },
  PUBLISHED: { label: '공개', icon: Globe2 },
  HIDDEN: { label: '숨김', icon: EyeOff },
  REMOVED: { label: '삭제됨', icon: Trash2 },
} as const

function defaultScheduleValue(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function EpisodeTable({
  availableAssets = [],
  episodes,
  structure = [],
  workType = 'SERIES',
}: {
  readonly availableAssets?: readonly StudioAssetOption[]
  readonly episodes: readonly EpisodeResponse[]
  readonly structure?: readonly StudioEpisodeAnalytics[]
  readonly workType?: WorkType
}): ReactNode {
  const router = useRouter()
  const [rows, setRows] = useState<readonly EpisodeResponse[]>(episodes)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [scheduleValue, setScheduleValue] = useState(defaultScheduleValue)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | EpisodeResponse['status']
  >('ALL')
  const [seasonFilter, setSeasonFilter] = useState('ALL')
  const episodic = workType === 'SERIES'
  useEffect(() => {
    setRows(episodes)
  }, [episodes])
  const structureById = useMemo(
    () => new Map(structure.map((item) => [item.id, item])),
    [structure],
  )
  const seasons = useMemo(
    () =>
      [...new Set(structure.flatMap((item) => item.seasonNumber ?? []))].sort(
        (left, right) => left - right,
      ),
    [structure],
  )
  const visibleEpisodes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    return [...rows]
      .filter((episode) => {
        const meta = structureById.get(episode.id)
        return (
          (statusFilter === 'ALL' || episode.status === statusFilter) &&
          (seasonFilter === 'ALL' ||
            String(meta?.seasonNumber ?? 1) === seasonFilter) &&
          (normalized === '' ||
            episode.title.toLocaleLowerCase('ko-KR').includes(normalized) ||
            String(episode.number) === normalized)
        )
      })
      .sort((left, right) => {
        const leftSeason = structureById.get(left.id)?.seasonNumber ?? 1
        const rightSeason = structureById.get(right.id)?.seasonNumber ?? 1
        return leftSeason - rightSeason || left.number - right.number
      })
  }, [query, rows, seasonFilter, statusFilter, structureById])

  if (rows.length === 0) {
    return (
      <EmptyState
        title={
          episodic ? '아직 회차가 없습니다' : '아직 연결된 영상이 없습니다'
        }
        description={
          episodic
            ? '준비된 영상으로 첫 회차를 추가해 보세요.'
            : '준비된 영상을 이 작품의 본편이나 버전으로 연결해 보세요.'
        }
        action={
          <Button type="button" onClick={openEpisodeCreator}>
            {episodic ? '첫 회차 추가' : '첫 영상 연결'}
          </Button>
        }
      />
    )
  }

  const transition = async (
    episodeId: string,
    action: 'PUBLISH' | 'SCHEDULE' | 'HIDE' | 'UNHIDE',
    publishAt?: string,
  ): Promise<void> => {
    setBusyId(episodeId)
    setError(null)
    try {
      const response = await fetch(`/api/episodes/${episodeId}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(publishAt === undefined ? {} : { publishAt }),
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const apiError = readApiError(payload)
        setError(
          apiError?.message ??
            '상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        )
        // 구버전 서버에서 핵심 변경 후 부가 작업만 실패한 경우도 복구한다.
        router.refresh()
        return
      }
      const result = payload as PublishEpisodeResponse
      setRows((current) =>
        current.map((episode) =>
          episode.id === episodeId
            ? {
                ...episode,
                status: result.status,
                publishAt: result.publishAt,
                publishedAt: result.publishedAt,
              }
            : episode,
        ),
      )
      setSchedulingId(null)
      router.refresh()
    } catch {
      setError('네트워크 연결을 확인한 뒤 다시 시도해 주세요.')
    } finally {
      setBusyId(null)
    }
  }

  const schedule = (episodeId: string): void => {
    const parsed = new Date(scheduleValue)
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      setError('현재보다 뒤의 예약 시각을 선택해 주세요.')
      return
    }
    void transition(episodeId, 'SCHEDULE', parsed.toISOString())
  }

  const remove = async (episodeId: string): Promise<void> => {
    if (!window.confirm('이 에피소드를 삭제할까요?')) return
    setBusyId(episodeId)
    setError(null)
    const response = await fetch(`/api/episodes/${episodeId}`, {
      method: 'DELETE',
    })
    setBusyId(null)
    if (!response.ok) {
      setError('에피소드를 삭제하지 못했습니다.')
      return
    }
    router.refresh()
  }

  return (
    <div className="studio-episode-panel">
      {error === null ? null : (
        <p role="alert" className="studio-inline-error">
          {error}
        </p>
      )}
      <div className="studio-episode-toolbar">
        <label className="studio-episode-search">
          <Search aria-hidden="true" />
          <span className="sr-only">{episodic ? '회차' : '영상'} 검색</span>
          <input
            type="search"
            value={query}
            placeholder={episodic ? '제목 또는 회차 검색' : '영상 제목 검색'}
            onChange={(event) => {
              setQuery(event.currentTarget.value)
            }}
          />
        </label>
        {episodic ? (
          <label>
            <span>시즌</span>
            <select
              value={seasonFilter}
              onChange={(event) => {
                setSeasonFilter(event.currentTarget.value)
              }}
            >
              <option value="ALL">전체 시즌</option>
              {seasons.map((season) => (
                <option key={season} value={String(season)}>
                  시즌 {season}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>상태</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.currentTarget.value as 'ALL' | EpisodeResponse['status'],
              )
            }}
          >
            <option value="ALL">전체 상태</option>
            <option value="DRAFT">초안</option>
            <option value="SCHEDULED">예약</option>
            <option value="PUBLISHED">공개</option>
            <option value="HIDDEN">숨김</option>
          </select>
        </label>
        <span>
          전체 {rows.length}개 · 표시 {visibleEpisodes.length}개
        </span>
      </div>
      <div className="studio-table-scroll">
        <table className="studio-episode-table">
          <thead>
            <tr>
              <th>{episodic ? '회차' : '영상'}</th>
              <th>상태</th>
              <th>공개 시각</th>
              <th>성과</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {visibleEpisodes.map((episode) => {
              const status = STATUS[episode.status]
              const StatusIcon = status.icon
              const busy = busyId === episode.id
              const episodeStructure = structureById.get(episode.id)
              return (
                <React.Fragment key={episode.id}>
                  <tr>
                    <td>
                      <div className="studio-episode-title">
                        <span className="studio-episode-thumb">
                          {episode.thumbUrl === undefined ? (
                            <Clapperboard aria-hidden="true" />
                          ) : (
                            <img src={episode.thumbUrl} alt="" />
                          )}
                        </span>
                        <span>
                          <strong>{episode.title}</strong>
                          <small>
                            {episodic
                              ? `시즌 ${String(episodeStructure?.seasonNumber ?? 1)} · ${String(episode.number)}화`
                              : `영상 ${String(episode.number)}`}{' '}
                            · {episode.ageRating}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="studio-visibility-cell">
                        <div
                          className="studio-visibility-control"
                          data-status={episode.status}
                        >
                          <StatusIcon aria-hidden="true" />
                          <select
                            aria-label={`${episode.title} 공개 상태`}
                            value={episode.status}
                            disabled={busy || episode.status === 'REMOVED'}
                            onChange={(event) => {
                              const next = event.currentTarget.value
                              if (next === episode.status) return
                              if (next === 'SCHEDULED') {
                                setError(null)
                                setScheduleValue(defaultScheduleValue())
                                setSchedulingId(episode.id)
                                return
                              }
                              if (next === 'HIDDEN') {
                                void transition(episode.id, 'HIDE')
                                return
                              }
                              if (next === 'PUBLISHED') {
                                void transition(
                                  episode.id,
                                  episode.status === 'HIDDEN'
                                    ? 'UNHIDE'
                                    : 'PUBLISH',
                                )
                              }
                            }}
                          >
                            <option value={episode.status}>
                              {status.label}
                            </option>
                            {episode.status === 'DRAFT' ? (
                              <>
                                <option value="PUBLISHED">공개</option>
                                <option value="SCHEDULED">예약</option>
                              </>
                            ) : null}
                            {episode.status === 'SCHEDULED' ? (
                              <option value="PUBLISHED">지금 공개</option>
                            ) : null}
                            {episode.status === 'PUBLISHED' ? (
                              <option value="HIDDEN">숨김</option>
                            ) : null}
                            {episode.status === 'HIDDEN' ? (
                              <option value="PUBLISHED">다시 공개</option>
                            ) : null}
                          </select>
                          <ChevronDown aria-hidden="true" />
                        </div>
                        {schedulingId === episode.id ? (
                          <div className="studio-schedule-editor">
                            <label>
                              <span>공개 예약 시각</span>
                              <input
                                type="datetime-local"
                                value={scheduleValue}
                                onChange={(event) => {
                                  setScheduleValue(event.currentTarget.value)
                                }}
                              />
                            </label>
                            <div>
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => {
                                  schedule(episode.id)
                                }}
                              >
                                예약 적용
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busy}
                                onClick={() => {
                                  setSchedulingId(null)
                                }}
                              >
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {episode.publishAt === null
                        ? '—'
                        : new Date(episode.publishAt).toLocaleString('ko-KR')}
                    </td>
                    <td>
                      <div className="studio-episode-metrics">
                        <span title="조회수">
                          <Eye aria-hidden="true" />{' '}
                          {new Intl.NumberFormat('ko-KR', {
                            notation: 'compact',
                          }).format(BigInt(episode.viewCount))}
                        </span>
                        <span title="좋아요">
                          <Heart aria-hidden="true" /> {episode.likeCount}
                        </span>
                        <span title="댓글">
                          <MessageCircle aria-hidden="true" />{' '}
                          {episode.commentCount}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="studio-episode-actions">
                        {episode.status === 'REMOVED' ? null : (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              asChild
                              className="studio-episode-action"
                            >
                              <Link
                                href={`/studio/series/${episode.seriesId}/episodes/${episode.id}`}
                              >
                                <BarChart3 aria-hidden="true" /> 데이터
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="studio-episode-action"
                              disabled={busy}
                              onClick={() => {
                                setEditingId(
                                  editingId === episode.id ? null : episode.id,
                                )
                              }}
                            >
                              <Edit3 aria-hidden="true" /> 수정
                            </Button>
                          </>
                        )}
                        {episode.status === 'REMOVED' ? null : (
                          <Button
                            size="sm"
                            variant="danger"
                            className="studio-episode-action is-danger"
                            disabled={busy}
                            onClick={() => void remove(episode.id)}
                          >
                            <Trash2 aria-hidden="true" /> 삭제
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editingId === episode.id ? (
                    <tr className="studio-episode-edit-row">
                      <td colSpan={5}>
                        <EditEpisodeForm
                          episode={episode}
                          availableAssets={availableAssets}
                          seasonNumber={episodeStructure?.seasonNumber ?? 1}
                          workType={workType}
                          onClose={() => {
                            setEditingId(null)
                          }}
                        />
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              )
            })}
            {visibleEpisodes.length === 0 ? (
              <tr>
                <td colSpan={5} className="studio-episode-filter-empty">
                  조건에 맞는 회차가 없습니다. 검색어나 필터를 변경해 주세요.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
