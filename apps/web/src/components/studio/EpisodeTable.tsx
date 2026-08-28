'use client'

import type { EpisodeResponse } from '@aidream/core'
import { Badge, Button, EmptyState } from '@aidream/ui'
import { Clapperboard, Edit3, Eye, Heart, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState, type ReactNode } from 'react'

import type { StudioAssetOption } from '@/src/services/studio/get-studio-dashboard'

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
}: {
  readonly availableAssets?: readonly StudioAssetOption[]
  readonly episodes: readonly EpisodeResponse[]
}): ReactNode {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  if (episodes.length === 0) {
    return (
      <EmptyState
        title="아직 에피소드가 없습니다"
        description="준비된 영상 자산으로 첫 에피소드를 추가해 보세요."
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
      <div className="studio-table-scroll">
        <table className="studio-episode-table">
          <thead>
            <tr>
              <th>콘텐츠</th>
              <th>상태</th>
              <th>공개 시각</th>
              <th>성과</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {episodes.map((episode) => {
              const status = STATUS[episode.status]
              const busy = busyId === episode.id
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
                            {episode.number}화 · {episode.ageRating}
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
          </tbody>
        </table>
      </div>
    </div>
  )
}
