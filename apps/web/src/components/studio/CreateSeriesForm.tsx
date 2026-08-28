'use client'

import { Button, Input, Textarea } from '@aidream/ui'
import { useRouter } from 'next/navigation'
import React, { useState, type ReactNode, type SyntheticEvent } from 'react'

import { WORK_TYPE_OPTIONS } from './work-types'

export function CreateSeriesForm(): ReactNode {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (
    event: SyntheticEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const data = new FormData(event.currentTarget)
    const synopsis = data.get('synopsis')
    const response = await fetch('/api/series', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: data.get('title'),
        workType: data.get('workType'),
        ...(typeof synopsis === 'string' && synopsis !== ''
          ? { synopsis }
          : {}),
        ageRating: data.get('ageRating'),
      }),
    })
    const payload = (await response.json()) as { id?: string }
    if (!response.ok || payload.id === undefined) {
      setError(
        '작품을 만들지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.',
      )
      setBusy(false)
      return
    }
    router.push(`/studio/series/${payload.id}`)
    router.refresh()
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="studio-series-form"
    >
      <fieldset className="studio-work-type-fieldset">
        <legend>작품 형식</legend>
        <p>영상의 성격에 맞는 관리 구조와 용어를 적용합니다.</p>
        <div className="studio-work-type-grid">
          {WORK_TYPE_OPTIONS.map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                name="workType"
                value={option.value}
                defaultChecked={option.value === 'SERIES'}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Input label="작품(시리즈) 제목" name="title" required maxLength={120} />
      <Textarea label="작품 소개" name="synopsis" maxLength={2000} />
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
      {error === null ? null : (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? '만드는 중…' : '작품 만들기'}
      </Button>
    </form>
  )
}
