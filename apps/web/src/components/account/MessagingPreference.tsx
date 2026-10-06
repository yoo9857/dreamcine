'use client'

import type { DmPolicy } from '@aidream/core'
import { LoaderCircle } from 'lucide-react'
import React, { useState, type ReactNode } from 'react'

import { readApiError } from '@/src/lib/error-messages'

const OPTIONS: readonly {
  readonly value: DmPolicy
  readonly label: string
  readonly description: string
}[] = [
  {
    value: 'EVERYONE',
    label: '모두',
    description: '로그인한 모든 독자가 메시지를 보낼 수 있습니다.',
  },
  {
    value: 'FOLLOWERS',
    label: '팔로워만',
    description: '나를 팔로우한 독자만 메시지를 보낼 수 있습니다.',
  },
  {
    value: 'NOBODY',
    label: '받지 않음',
    description:
      '새 메시지를 받지 않습니다. 이미 받은 대화에는 계속 답할 수 있습니다.',
  },
]

/** 작가가 메시지를 받는 범위. (ISS-023) */
export function MessagingPreference({
  initialPolicy,
}: {
  readonly initialPolicy: DmPolicy
}): ReactNode {
  const [policy, setPolicy] = useState(initialPolicy)
  const [saving, setSaving] = useState<DmPolicy | null>(null)
  const [message, setMessage] = useState('')

  async function update(next: DmPolicy): Promise<void> {
    if (next === policy || saving !== null) return
    setSaving(next)
    setMessage('')
    try {
      const response = await fetch('/api/account/messaging', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dmPolicy: next }),
      })
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null)
        setMessage(
          readApiError(payload)?.message ?? '설정을 저장하지 못했습니다.',
        )
        return
      }
      setPolicy(next)
      const label = OPTIONS.find((option) => option.value === next)?.label
      setMessage(`메시지 받기를 '${label ?? next}'(으)로 바꿨습니다.`)
    } catch {
      setMessage('네트워크 연결을 확인한 뒤 다시 시도해 주세요.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="account-consent-card">
      <div
        className="account-messaging-options"
        role="radiogroup"
        aria-label="메시지 받는 범위"
      >
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={policy === option.value}
            disabled={saving !== null}
            onClick={() => void update(option.value)}
          >
            <strong>
              {saving === option.value ? (
                <LoaderCircle aria-hidden="true" className="is-spinning" />
              ) : null}
              {option.label}
            </strong>
            <span>{option.description}</span>
          </button>
        ))}
      </div>
      <p className="account-consent-status" role="status">
        {message}
      </p>
    </div>
  )
}
