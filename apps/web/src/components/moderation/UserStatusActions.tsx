'use client'

import { Button, Select, Textarea } from '@aidream/ui'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export function UserStatusActions({ userId }: { userId: string }) {
  const router = useRouter()
  const [status, setStatus] = useState('SUSPENDED')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  async function submit(): Promise<void> {
    if (reason.trim() === '') {
      setError('상태 변경 사유를 입력해 주세요.')
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason: reason.trim() }),
      })
      if (!response.ok) throw new Error('사용자 상태를 변경하지 못했습니다.')
      router.refresh()
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : '사용자 상태를 변경하지 못했습니다.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-w-64 flex-col gap-2">
      <Select
        label="계정 상태"
        value={status}
        onValueChange={(value) => {
          setStatus(value)
        }}
        options={[
          { value: 'SUSPENDED', label: '정지' },
          { value: 'ACTIVE', label: '정지 해제' },
        ]}
      />
      <Textarea
        label="변경 사유"
        value={reason}
        onChange={(event) => {
          setReason(event.target.value)
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
        {busy ? '처리 중…' : '상태 변경'}
      </Button>
    </div>
  )
}
