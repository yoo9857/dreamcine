'use client'

import { Button, Select, Textarea } from '@aidream/ui'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ReportActions({
  reportId,
  admin,
}: {
  reportId: string
  admin: boolean
}) {
  const router = useRouter()
  const [action, setAction] = useState('HIDE_CONTENT')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  async function submit(): Promise<void> {
    setBusy(true)
    setError(undefined)
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(note.trim() === '' ? {} : { note: note.trim() }),
        }),
      })
      if (!response.ok) throw new Error('심사 조치를 완료하지 못했습니다.')
      router.refresh()
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : '심사 조치를 완료하지 못했습니다.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-w-64 flex-col gap-2">
      <Select
        label="심사 조치"
        value={action}
        onValueChange={(value) => {
          setAction(value)
        }}
        options={[
          { value: 'HIDE_CONTENT', label: '콘텐츠 숨김' },
          { value: 'REMOVE_CONTENT', label: '영구 삭제', disabled: !admin },
          { value: 'SUSPEND_USER', label: '계정 정지', disabled: !admin },
          { value: 'REJECT', label: '신고 기각' },
        ]}
      />
      <Textarea
        label="조치 메모"
        value={note}
        onChange={(event) => {
          setNote(event.target.value)
        }}
        maxLength={1000}
        rows={2}
        {...(error === undefined ? {} : { error })}
      />
      <Button
        size="sm"
        disabled={busy}
        onClick={() => {
          void submit()
        }}
      >
        {busy ? '처리 중…' : '조치 적용'}
      </Button>
    </div>
  )
}
