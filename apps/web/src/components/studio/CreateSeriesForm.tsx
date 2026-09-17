'use client'

import type { WorkType } from '@aidream/core'
import { Button, Input, Textarea } from '@aidream/ui'
import { useRouter } from 'next/navigation'
import React, { useState, type ReactNode, type SyntheticEvent } from 'react'

import { WORK_TYPE_OPTIONS } from './work-types'

/** 폼 값은 문자열이다. 서버 응답에 형식이 없을 때만 쓰는 좁힘 helper. */
function readWorkType(value: FormDataEntryValue | null): WorkType {
  const match = WORK_TYPE_OPTIONS.find((option) => option.value === value)
  return match?.value ?? 'SERIES'
}

export function CreateSeriesForm({
  onCreated,
  submitLabel = '시리즈 만들기',
}: {
  /**
   * 시리즈를 만든 뒤 이동 대신 호출할 콜백. `/studio/new` 의 단계형 흐름은
   * 화면을 떠나지 않고 다음 단계로 이어가야 하므로 이 경로를 쓴다.
   */
  readonly onCreated?: (series: {
    id: string
    title: string
    workType: WorkType
  }) => void
  readonly submitLabel?: string
} = {}): ReactNode {
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
    const payload = (await response.json()) as {
      id?: string
      title?: string
      workType?: WorkType
    }
    if (!response.ok || payload.id === undefined) {
      setError(
        '시리즈를 만들지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.',
      )
      setBusy(false)
      return
    }
    if (onCreated !== undefined) {
      const workType = payload.workType ?? readWorkType(data.get('workType'))
      // 방금 입력한 제목을 그대로 넘긴다. 다음 단계가 "어느 시리즈에 넣는지"
      // 를 확인시켜 주는 자리라, 형식 이름으로 대신하면 확인이 되지 않는다.
      const submitted = data.get('title')
      const title =
        payload.title ?? (typeof submitted === 'string' ? submitted : '')
      onCreated({ id: payload.id, title, workType })
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
        <legend>시리즈 형식</legend>
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
      <Input label="시리즈 제목" name="title" required maxLength={120} />
      <Textarea label="시리즈 소개" name="synopsis" maxLength={2000} />
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
        {busy ? '만드는 중…' : submitLabel}
      </Button>
    </form>
  )
}
