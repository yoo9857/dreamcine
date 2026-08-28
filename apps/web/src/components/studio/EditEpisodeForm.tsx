'use client'

import type { EpisodeResponse } from '@aidream/core'
import { Button, Input, Textarea } from '@aidream/ui'
import { Save, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState, type ReactNode, type SyntheticEvent } from 'react'

import type { StudioAssetOption } from '@/src/services/studio/get-studio-dashboard'

import { AiDisclosureField } from './AiDisclosureField'

export function EditEpisodeForm({
  availableAssets,
  episode,
  onClose,
}: {
  readonly availableAssets: readonly StudioAssetOption[]
  readonly episode: EpisodeResponse
  readonly onClose: () => void
}): ReactNode {
  const router = useRouter()
  const [aiDisclosure, setAiDisclosure] = useState(episode.aiDisclosure ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (aiDisclosure.trim() === '') {
      setError('AI 제작 표기를 입력해 주세요.')
      return
    }
    const data = new FormData(event.currentTarget)
    const description = data.get('description')
    const assetId = data.get('assetId')
    setBusy(true)
    setError('')
    const response = await fetch(`/api/episodes/${episode.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: data.get('title'),
        description:
          typeof description === 'string' && description !== ''
            ? description
            : null,
        ageRating: data.get('ageRating'),
        aiDisclosure,
        ...(typeof assetId === 'string' && assetId !== '' ? { assetId } : {}),
      }),
    })
    setBusy(false)
    if (!response.ok) {
      setError(
        '에피소드 정보를 저장하지 못했습니다. 입력 내용을 확인해 주세요.',
      )
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <form
      className="studio-episode-editor"
      onSubmit={(event) => void submit(event)}
    >
      <div className="studio-episode-edit-grid">
        <Input
          label="에피소드 제목"
          name="title"
          defaultValue={episode.title}
          required
          maxLength={160}
        />
        <label className="studio-field-label">
          관람 등급
          <select name="ageRating" defaultValue={episode.ageRating}>
            <option value="ALL">전체 관람가</option>
            <option value="A12">12세 이상</option>
            <option value="A15">15세 이상</option>
            <option value="A19">19세 이상</option>
          </select>
        </label>
        <Textarea
          label="설명"
          name="description"
          defaultValue={episode.description ?? ''}
          maxLength={2000}
        />
        <label className="studio-field-label">
          <span>연결 영상</span>
          <select
            name="assetId"
            defaultValue={episode.assetId ?? ''}
            disabled={episode.assetId === null && availableAssets.length === 0}
          >
            {episode.assetId === null ? (
              <option value="">연결된 영상 없음</option>
            ) : (
              <option value={episode.assetId}>현재 연결 영상 유지</option>
            )}
            {availableAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.fileName}
              </option>
            ))}
          </select>
          <small>사용 가능한 영상으로 교체할 수 있습니다.</small>
        </label>
        <AiDisclosureField
          value={aiDisclosure}
          onChange={setAiDisclosure}
          {...(error === '' ? {} : { error })}
        />
      </div>
      <div className="studio-episode-edit-actions">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onClose}
        >
          <X aria-hidden="true" /> 취소
        </Button>
        <Button type="submit" disabled={busy}>
          <Save aria-hidden="true" /> {busy ? '저장 중…' : '변경사항 저장'}
        </Button>
      </div>
    </form>
  )
}
