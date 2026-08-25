'use client'

import { Button, Input, Textarea } from '@aidream/ui'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode, type SyntheticEvent } from 'react'

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
        ...(typeof synopsis === 'string' && synopsis !== ''
          ? { synopsis }
          : {}),
        ageRating: data.get('ageRating'),
      }),
    })
    const payload = (await response.json()) as { id?: string }
    if (!response.ok || payload.id === undefined) {
      setError(
        '시리즈를 만들지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.',
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
      className="flex max-w-2xl flex-col gap-5"
    >
      <Input label="시리즈 제목" name="title" required maxLength={120} />
      <Textarea label="작품 소개" name="synopsis" maxLength={2000} />
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
      {error === null ? null : (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? '만드는 중…' : '시리즈 만들기'}
      </Button>
    </form>
  )
}
