'use client'

import { SignupSchema } from '@aidream/core'
import { useState, type ReactNode } from 'react'
import Link from 'next/link'

import { readApiError, staticMessageFor } from '@/src/lib/error-messages'

type FormState = 'idle' | 'submitting' | 'error' | 'sent'

const FIELD_LABELS: Record<string, string> = {
  email: '이메일',
  password: '비밀번호',
  handle: '아이디',
  displayName: '표시 이름',
}

export function SignupForm(): ReactNode {
  const [values, setValues] = useState({
    email: '',
    password: '',
    handle: '',
    displayName: '',
  })
  const [state, setState] = useState<FormState>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  function update(name: keyof typeof values, value: string): void {
    setValues((previous) => ({ ...previous, [name]: value }))
  }

  async function submit(): Promise<void> {
    setState('submitting')
    setMessage(null)
    setFields({})

    // 서버와 같은 스키마로 먼저 걸러 왕복을 줄인다. (07_AUTH_SECURITY.md §5)
    const parsed = SignupSchema.safeParse(values)
    if (!parsed.success) {
      const found: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.')
        found[key] ??= issue.message
      }
      setState('error')
      setFields(found)
      setMessage(staticMessageFor('E_VALIDATION'))
      return
    }

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })

    if (response.ok) {
      setState('sent')
      return
    }

    const failure = readApiError(await response.json().catch(() => null))
    setState('error')
    setFields(failure?.fields ?? {})
    setMessage(failure?.message ?? staticMessageFor('E_INTERNAL'))
  }

  if (state === 'sent') {
    return (
      <div className="auth-card">
        <h1>인증 메일을 보냈습니다</h1>
        <p className="hint" data-testid="signup-sent">
          {values.email} 으로 인증 메일을 보냈습니다. 메일의 링크를 열면 가입이
          완료됩니다.
        </p>
        <p className="hint">
          <Link href="/login">로그인으로 이동</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <h1>회원가입</h1>
      {message === null ? null : (
        <p className="error" role="alert" data-testid="signup-error">
          {message}
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {(
          [
            ['email', 'email', 'email'],
            ['handle', 'text', 'username'],
            ['displayName', 'text', 'nickname'],
            ['password', 'password', 'new-password'],
          ] as const
        ).map(([name, type, autoComplete]) => (
          <label className="field" key={name}>
            <span>
              {FIELD_LABELS[name] ?? name}
              {fields[name] === undefined ? '' : ` — ${fields[name]}`}
            </span>
            <input
              name={name}
              type={type}
              autoComplete={autoComplete}
              required
              value={values[name]}
              onChange={(event) => {
                update(name, event.target.value)
              }}
            />
          </label>
        ))}
        <button type="submit" disabled={state === 'submitting'}>
          {state === 'submitting' ? '가입 중…' : '가입하기'}
        </button>
      </form>
      <p className="hint">
        이미 계정이 있으신가요? <Link href="/login">로그인</Link>
      </p>
    </div>
  )
}
