'use client'

import { Check, LoaderCircle, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState, type ReactNode, type SyntheticEvent } from 'react'

interface AccountSettingsFormProps {
  readonly initialDisplayName: string
  readonly initialBio: string | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function AccountSettingsForm({
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
      setMessage('프로필이 안전하게 저장되었습니다.')
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
      <label>
        <span>표시 이름</span>
        <input
          name="displayName"
          defaultValue={initialDisplayName}
          minLength={1}
          maxLength={50}
          required
          autoComplete="name"
        />
        <small>작품과 댓글에 표시되는 이름입니다.</small>
      </label>
      <label>
        <span>소개</span>
        <textarea
          name="bio"
          defaultValue={initialBio ?? ''}
          maxLength={300}
          rows={5}
          placeholder="당신의 이야기와 작업 세계를 소개해 주세요."
          onChange={(event) => {
            setBioLength(event.currentTarget.value.length)
          }}
        />
        <small className="account-bio-count">{bioLength} / 300</small>
      </label>
      <div className="account-form-footer">
        <p role={state === 'error' ? 'alert' : 'status'} data-state={state}>
          {state === 'saved' ? <Check aria-hidden="true" /> : null}
          {message}
        </p>
        <button type="submit" disabled={state === 'saving'}>
          {state === 'saving' ? (
            <LoaderCircle className="is-spinning" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {state === 'saving' ? '저장 중…' : '변경사항 저장'}
        </button>
      </div>
    </form>
  )
}
