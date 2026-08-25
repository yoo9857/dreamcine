'use client'

import type { EpisodeResponse } from '@aidream/core'
import { Badge, Button, EmptyState } from '@aidream/ui'
import { useRouter } from 'next/navigation'
import React, { useState, type ReactNode } from 'react'

const STATUS = {
  DRAFT: { label: '초안', tone: 'neutral' },
  SCHEDULED: { label: '예약', tone: 'warning' },
  PUBLISHED: { label: '공개', tone: 'success' },
  HIDDEN: { label: '숨김', tone: 'danger' },
  REMOVED: { label: '삭제됨', tone: 'danger' },
} as const

export function EpisodeTable({
  episodes,
}: {
  readonly episodes: readonly EpisodeResponse[]
}): ReactNode {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    <div className="flex flex-col gap-3">
      {error === null ? null : (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-xl text-left text-sm">
          <thead className="bg-bg-subtle text-fg-secondary">
            <tr>
              <th className="p-3">회차</th>
              <th className="p-3">제목</th>
              <th className="p-3">상태</th>
              <th className="p-3">공개 시각</th>
              <th className="p-3">작업</th>
            </tr>
          </thead>
          <tbody>
            {episodes.map((episode) => {
              const status = STATUS[episode.status]
              const busy = busyId === episode.id
              return (
                <tr key={episode.id} className="border-t border-border">
                  <td className="p-3">{episode.number}화</td>
                  <td className="p-3 font-medium text-fg">{episode.title}</td>
                  <td className="p-3">
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </td>
                  <td className="p-3 text-fg-muted">
                    {episode.publishAt === null
                      ? '—'
                      : new Date(episode.publishAt).toLocaleString('ko-KR')}
                  </td>
                  <td className="flex flex-wrap gap-2 p-3">
                    {episode.status === 'DRAFT' ? (
                      <>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void transition(episode.id, 'PUBLISH')}
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
                        onClick={() => void transition(episode.id, 'PUBLISH')}
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
                        onClick={() => void transition(episode.id, 'UNHIDE')}
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
