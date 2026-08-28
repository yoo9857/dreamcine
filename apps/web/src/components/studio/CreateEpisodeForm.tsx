'use client'

import type { WorkType } from '@aidream/core'
import { Button, Input, Textarea } from '@aidream/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState, type ReactNode, type SyntheticEvent } from 'react'

import type { StudioAssetOption } from '@/src/services/studio/get-studio-dashboard'

import { AiDisclosureField } from './AiDisclosureField'

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '길이 확인 중'
  const minutes = Math.floor(seconds / 60)
  const remainder = String(seconds % 60).padStart(2, '0')
  return `${String(minutes)}:${remainder}`
}

export function CreateEpisodeForm({
  availableAssets = [],
  seriesId,
  workType = 'SERIES',
}: {
  readonly availableAssets?: readonly StudioAssetOption[]
  readonly seriesId: string
  readonly workType?: WorkType
}): ReactNode {
  const router = useRouter()
  const [aiDisclosure, setAiDisclosure] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const episodic = workType === 'SERIES'

  const submit = async (
    event: SyntheticEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault()
    if (aiDisclosure.trim() === '') {
      setError('AI 제작 표기를 입력해 주세요.')
      return
    }
    setBusy(true)
    setError(null)
    const form = event.currentTarget
    const data = new FormData(form)
    const description = data.get('description')
    const tagsValue = data.get('tags')
    const response = await fetch('/api/episodes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        seriesId,
        seasonNumber: Number(data.get('seasonNumber')),
        number: Number(data.get('number')),
        title: data.get('title'),
        ...(typeof description === 'string' && description !== ''
          ? { description }
          : {}),
        assetId: data.get('assetId'),
        ageRating: data.get('ageRating'),
        aiDisclosure,
        tags: (typeof tagsValue === 'string' ? tagsValue : '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    })
    if (!response.ok) {
      setError(
        '에피소드를 만들지 못했습니다. 영상 자산과 회차를 확인해 주세요.',
      )
      setBusy(false)
      return
    }
    form.reset()
    setAiDisclosure('')
    setBusy(false)
    router.refresh()
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="studio-episode-form"
    >
      {episodic ? (
        <Input
          label="시즌"
          name="seasonNumber"
          type="number"
          min={1}
          defaultValue={1}
          required
        />
      ) : (
        <input type="hidden" name="seasonNumber" value="1" />
      )}
      <Input
        label={episodic ? '회차' : '영상 순서'}
        name="number"
        type="number"
        min={1}
        defaultValue={1}
        required
      />
      <div className="md:col-span-2">
        <Input
          label={episodic ? '회차 제목' : '영상 제목'}
          name="title"
          required
          maxLength={160}
        />
      </div>
      <div className="md:col-span-2">
        <Textarea label="설명" name="description" maxLength={2000} />
      </div>
      <label className="studio-field-label">
        <span>업로드 완료 영상</span>
        <select name="assetId" required disabled={availableAssets.length === 0}>
          <option value="">영상을 선택하세요</option>
          {availableAssets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.fileName} · {formatDuration(asset.durationSec)}
            </option>
          ))}
        </select>
        {availableAssets.length === 0 ? (
          <small>
            사용할 수 있는 영상이 없습니다.{' '}
            <Link href="/studio/upload">영상을 먼저 업로드하세요.</Link>
          </small>
        ) : (
          <small>
            변환이 완료됐고 다른 에피소드에 연결되지 않은 영상만 표시됩니다.
          </small>
        )}
      </label>
      <Input
        label="태그"
        name="tags"
        hint="쉼표로 구분하며 최대 10개까지 입력할 수 있습니다."
      />
      <label className="studio-field-label">
        관람 등급
        <select
          name="ageRating"
          defaultValue="ALL"
          className="h-10 rounded-md border border-border bg-bg-elevated px-3 text-fg"
        >
          <option value="ALL">전체 관람가</option>
          <option value="A12">12세 이상</option>
          <option value="A15">15세 이상</option>
          <option value="A19">19세 이상</option>
        </select>
      </label>
      <div className="md:col-span-2">
        <AiDisclosureField
          value={aiDisclosure}
          onChange={setAiDisclosure}
          {...(error === null ? {} : { error })}
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? '추가 중…' : episodic ? '회차 추가' : '영상 추가'}
        </Button>
      </div>
    </form>
  )
}
