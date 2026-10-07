'use client'

import { Button, Select, Textarea } from '@aidream/ui'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { SuspensionDurationSelect } from './SuspensionDurationSelect'

export function ReportActions({
  reportId,
  admin,
}: {
  reportId: string
  admin: boolean
}) {
  const router = useRouter()
  const [action, setAction] = useState('WARN_USER')
  const [duration, setDuration] = useState('3')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  async function submit(): Promise<void> {
    if (action !== 'REJECT' && note.trim() === '') {
      setError('조치 사유를 입력해 주세요.')
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(action === 'SUSPEND_USER'
            ? {
                durationDays:
                  duration === 'permanent' ? null : Number(duration),
              }
            : {}),
          ...(note.trim() === '' ? {} : { note: note.trim() }),
        }),
      })
      if (!response.ok) throw new Error('신고 조치를 완료하지 못했습니다.')
      router.refresh()
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : '신고 조치를 완료하지 못했습니다.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="admin-inline-actions">
      <Select
        label="신고 조치"
        value={action}
        onValueChange={(value) => {
          setAction(value)
        }}
        options={[
          { value: 'WARN_USER', label: '계정 경고' },
          { value: 'HIDE_CONTENT', label: '콘텐츠 숨김' },
          { value: 'REMOVE_CONTENT', label: '영구 삭제', disabled: !admin },
          { value: 'SUSPEND_USER', label: '계정 정지', disabled: !admin },
          { value: 'REJECT', label: '신고 기각' },
        ]}
      />
      {action === 'SUSPEND_USER' && (
        <SuspensionDurationSelect value={duration} onChange={setDuration} />
      )}
      <Textarea
        label="조치 사유"
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
