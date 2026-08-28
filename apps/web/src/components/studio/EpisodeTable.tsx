'use client'

import type { EpisodeResponse, WorkType } from '@aidream/core'
import { Badge, Button, EmptyState } from '@aidream/ui'
import {
  BarChart3,
  Clapperboard,
  Edit3,
  Eye,
  Heart,
  MessageCircle,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useMemo, useState, type ReactNode } from 'react'

import type {
  StudioAssetOption,
  StudioEpisodeAnalytics,
} from '@/src/services/studio/get-studio-dashboard'

import { EditEpisodeForm } from './EditEpisodeForm'

const STATUS = {
  DRAFT: { label: '초안', tone: 'neutral' },
  SCHEDULED: { label: '예약', tone: 'warning' },
  PUBLISHED: { label: '공개', tone: 'success' },
  HIDDEN: { label: '숨김', tone: 'danger' },
  REMOVED: { label: '삭제됨', tone: 'danger' },
} as const

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
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | EpisodeResponse['status']
  >('ALL')
  const [seasonFilter, setSeasonFilter] = useState('ALL')
  const episodic = workType === 'SERIES'
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
    return [...episodes]
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
  }, [episodes, query, seasonFilter, statusFilter, structureById])

  if (episodes.length === 0) {
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
      />
    )
  }

  const transition = async (
    episodeId: string,
    action: 'PUBLISH' | 'SCHEDULE' | 'HIDE' | 'UNHIDE',
  ): Promise<void> => {
    let publishAt: string | undefined
    if (action === 'SCHEDULE') {
      const value = window.prompt(
        '예약 시각을 입력하세요. 예: 2026-08-26T18:00',
      )
      if (value === null) return
      const parsed = new Date(value)
      if (Number.isNaN(parsed.getTime())) {
        setError('올바른 예약 시각을 입력해 주세요.')
        return
      }
      publishAt = parsed.toISOString()
    }
    setBusyId(episodeId)
    setError(null)
    const response = await fetch(`/api/episodes/${episodeId}/publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action,
        ...(publishAt === undefined ? {} : { publishAt }),
      }),
    })
    setBusyId(null)
    if (!response.ok) {
      setError(
        action === 'PUBLISH'
          ? '공개하지 못했습니다. 영상 변환 상태와 AI 제작 표기를 확인해 주세요.'
          : '상태를 변경하지 못했습니다.',
      )
      return
    }
    router.refresh()
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
          전체 {episodes.length}개 · 표시 {visibleEpisodes.length}개
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
                      <Badge tone={status.tone}>{status.label}</Badge>
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
                            <Link
                              href={`/studio/series/${episode.seriesId}/episodes/${episode.id}`}
                              className="studio-episode-data-link"
                            >
                              <BarChart3 aria-hidden="true" /> 데이터
                            </Link>
                            <Button
                              size="sm"
                              variant="secondary"
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
                        {episode.status === 'DRAFT' ? (
                          <>
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                void transition(episode.id, 'PUBLISH')
                              }
                            >
                              공개
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() =>
                                void transition(episode.id, 'SCHEDULE')
                              }
                            >
                              예약
                            </Button>
                          </>
                        ) : null}
                        {episode.status === 'SCHEDULED' ? (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void transition(episode.id, 'PUBLISH')
                            }
                          >
                            지금 공개
                          </Button>
                        ) : null}
                        {episode.status === 'PUBLISHED' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => void transition(episode.id, 'HIDE')}
                          >
                            숨기기
                          </Button>
                        ) : null}
                        {episode.status === 'HIDDEN' ? (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void transition(episode.id, 'UNHIDE')
                            }
                          >
                            다시 공개
                          </Button>
                        ) : null}
                        {episode.status === 'REMOVED' ? null : (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busy}
                            onClick={() => void remove(episode.id)}
                          >
                            삭제
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
