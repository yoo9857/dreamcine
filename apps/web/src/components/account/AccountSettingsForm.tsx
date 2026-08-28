'use client'

import { Avatar } from '@aidream/ui'
import { Check, LoaderCircle, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState, type ReactNode, type SyntheticEvent } from 'react'

interface AccountSettingsFormProps {
  readonly handle: string
  readonly avatarUrl: string | null
  readonly initialDisplayName: string
  readonly initialBio: string | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function AccountSettingsForm({
  handle,
  avatarUrl,
  initialDisplayName,
  initialBio,
}: AccountSettingsFormProps): ReactNode {
  const router = useRouter()
  const [state, setState] = useState<SaveState>('idle')
  const [message, setMessage] = useState('')
  const [bioLength, setBioLength] = useState(initialBio?.length ?? 0)

  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setState('saving')
    setMessage('')
    const form = new FormData(event.currentTarget)
    const displayNameValue = form.get('displayName')
    const bioValue = form.get('bio')
    const displayName =
      typeof displayNameValue === 'string' ? displayNameValue.trim() : ''
    const bio = typeof bioValue === 'string' ? bioValue.trim() : ''

    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName, bio: bio === '' ? null : bio }),
      })
      const payload = (await response.json()) as {
        displayName?: string
        error?: { message?: string }
      }
      if (!response.ok || payload.displayName === undefined) {
        throw new Error(payload.error?.message ?? '저장하지 못했습니다.')
      }
      setState('saved')
      setMessage('변경사항을 저장했습니다.')
      router.refresh()
    } catch (error: unknown) {
      setState('error')
      setMessage(
        error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
      )
    }
  }

  return (
    <form
      className="account-profile-form"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <div className="account-profile-summary">
        <Avatar name={initialDisplayName} src={avatarUrl} size="lg" />
        <div>
          <strong>{initialDisplayName}</strong>
          <span>@{handle}</span>
        </div>
        <Link href={`/u/${encodeURIComponent(handle)}`}>미리보기 ↗</Link>
      </div>

      <div className="account-profile-fields">
        <label htmlFor="account-display-name">
          <span>표시 이름</span>
          <input
            id="account-display-name"
            aria-label="표시 이름"
            name="displayName"
            defaultValue={initialDisplayName}
            minLength={1}
            maxLength={50}
            required
            autoComplete="name"
          />
          <small>작품과 댓글에 표시됩니다.</small>
        </label>
        <label htmlFor="account-bio">
          <span>소개</span>
          <textarea
            id="account-bio"
            aria-label="소개"
            name="bio"
            defaultValue={initialBio ?? ''}
            maxLength={300}
            rows={3}
            placeholder="작업 세계와 이야기를 간결하게 소개해 주세요."
            onChange={(event) => {
              setBioLength(event.currentTarget.value.length)
            }}
          />
          <small className="account-bio-count">{bioLength} / 300</small>
        </label>
      </div>

      <div className="account-form-footer">
        <p role={state === 'error' ? 'alert' : 'status'} data-state={state}>
          {state === 'saved' ? <Check aria-hidden="true" /> : null}
          {message || '변경한 내용은 공개 프로필에 바로 반영됩니다.'}
        </p>
        <button type="submit" disabled={state === 'saving'}>
          {state === 'saving' ? (
            <LoaderCircle className="is-spinning" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {state === 'saving' ? '저장 중' : '변경사항 저장'}
        </button>
      </div>
    </form>
  )
}
