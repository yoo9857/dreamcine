'use client'

import { GRANTABLE_ROLES, type UserRole } from '@aidream/core'
import { Button, Select, Textarea } from '@aidream/ui'
import { RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

async function post(url: string, body?: unknown): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string }
    } | null
    throw new Error(payload?.error?.message ?? '요청을 처리하지 못했습니다.')
  }
}

const roleLabels: Readonly<Record<UserRole, string>> = {
  VIEWER: 'Viewer',
  MEMBER: 'Member',
  CREATOR: 'Creator',
  PARTNER: 'Partner',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
}

export function ApplicationStatusAction({
  id,
  current,
}: {
  id: string
  current: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState(current)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()
  return (
    <div className="admin-compact-action">
      <Select
        label="심사 상태"
        value={status}
        {...(error === undefined ? {} : { error })}
        onValueChange={(value) => {
          setStatus(value)
          setError(undefined)
        }}
        options={[
          { value: 'SUBMITTED', label: '접수' },
          { value: 'REVIEWING', label: '검토 중' },
          { value: 'SHORTLISTED', label: '후보 선정' },
          { value: 'ACCEPTED', label: '합격' },
          { value: 'REJECTED', label: '불합격' },
        ]}
      />
      <Button
        size="sm"
        disabled={busy || status === current}
        onClick={() => {
          setBusy(true)
          setError(undefined)
          void post(`/api/admin/creator-applications/${id}/status`, { status })
            .then(() => {
              router.refresh()
            })
            .catch((cause: unknown) => {
              setError(
                cause instanceof Error
                  ? cause.message
                  : '심사 상태를 저장하지 못했습니다.',
              )
            })
            .finally(() => {
              setBusy(false)
            })
        }}
      >
        {busy ? '저장 중…' : '저장'}
      </Button>
    </div>
  )
}

export function UserRoleAction({
  userId,
  current,
}: {
  userId: string
  current: string
}) {
  const router = useRouter()
  const [role, setRole] = useState(current)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()
  return (
    <div className="admin-inline-actions admin-role-action">
      <Select
        label="서비스 역할"
        value={role}
        onValueChange={(value) => {
          setRole(value)
          setError(undefined)
        }}
        options={GRANTABLE_ROLES.map((value) => ({
          value,
          label: roleLabels[value],
        }))}
      />
      <Textarea
        label="변경 사유"
        value={reason}
        rows={2}
        maxLength={500}
        onChange={(event) => {
          setReason(event.target.value)
          setError(undefined)
        }}
        {...(error === undefined ? {} : { error })}
      />
      <Button
        size="sm"
        disabled={busy || role === current || reason.trim() === ''}
        onClick={() => {
          setBusy(true)
          setError(undefined)
          void post(`/api/admin/users/${userId}/role`, {
            role,
            reason: reason.trim(),
          })
            .then(() => {
              router.refresh()
              setReason('')
            })
            .catch((cause: unknown) => {
              setError(
                cause instanceof Error
                  ? cause.message
                  : '회원 역할을 변경하지 못했습니다.',
              )
            })
            .finally(() => {
              setBusy(false)
            })
        }}
      >
        {busy ? '변경 중…' : '역할 변경'}
      </Button>
    </div>
  )
}

export function RetryAssetAction({
  id,
  disabled,
}: {
  id: string
  disabled: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()
  return (
    <span className="admin-retry-action">
      <button
        className="admin-retry-button"
        type="button"
        disabled={disabled || busy}
        onClick={() => {
          setBusy(true)
          setError(undefined)
          void post(`/api/admin/assets/${id}/retry`)
            .then(() => {
              router.refresh()
            })
            .catch((cause: unknown) => {
              setError(
                cause instanceof Error
                  ? cause.message
                  : '에셋을 재처리하지 못했습니다.',
              )
            })
            .finally(() => {
              setBusy(false)
            })
        }}
      >
        <RotateCcw />
        {busy ? '재처리 중' : '재처리'}
      </button>
      {error === undefined ? null : <small role="alert">{error}</small>}
    </span>
  )
}
