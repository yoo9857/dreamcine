'use client'

import { Button, Input, Textarea } from '@aidream/ui'
import { useRouter } from 'next/navigation'
import React, { useState, type ReactNode, type SyntheticEvent } from 'react'

import { AiDisclosureField } from './AiDisclosureField'

export function CreateEpisodeForm({
  seriesId,
}: {
  readonly seriesId: string
}): ReactNode {
  const router = useRouter()
  const [aiDisclosure, setAiDisclosure] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
      className="grid gap-4 rounded-xl border border-border p-5 md:grid-cols-2"
    >
      <Input
        label="시즌"
        name="seasonNumber"
        type="number"
        min={1}
        defaultValue={1}
        required
      />
      <Input label="회차" name="number" type="number" min={1} required />
      <div className="md:col-span-2">
        <Input label="에피소드 제목" name="title" required maxLength={160} />
      </div>
      <div className="md:col-span-2">
        <Textarea label="설명" name="description" maxLength={2000} />
      </div>
      <Input label="준비된 영상 자산 ID" name="assetId" required />
      <Input
        label="태그"
        name="tags"
        hint="쉼표로 구분하며 최대 10개까지 입력할 수 있습니다."
      />
      <label className="flex flex-col gap-1 text-sm font-medium text-fg-secondary">
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
          {busy ? '추가 중…' : '에피소드 추가'}
        </Button>
      </div>
    </form>
  )
}
