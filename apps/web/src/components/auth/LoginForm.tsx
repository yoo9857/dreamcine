'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

import { staticMessageFor } from '@/src/lib/error-messages'

type FormState = 'idle' | 'submitting' | 'error'

export function LoginForm(): ReactNode {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function submit(): Promise<void> {
    setState('submitting')
    setMessage(null)

    // 실패 사유를 구분하지 않는다. 서버도 동일 메시지를 쓴다. (07 §11)
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (!result.ok || result.error !== undefined) {
      setState('error')
      setMessage(staticMessageFor('E_AUTH_INVALID_CREDENTIALS'))
      return
    }

    const next = new URL(window.location.href).searchParams.get('next')
    window.location.assign(next?.startsWith('/') === true ? next : '/')
  }

  return (
    <div className="auth-card">
      <h1>로그인</h1>
      {message === null ? null : (
        <p className="error" role="alert" data-testid="login-error">
          {message}
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label className="field">
          <span>이메일</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
            }}
          />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
            }}
          />
        </label>
        <button type="submit" disabled={state === 'submitting'}>
          {state === 'submitting' ? '로그인 중…' : '로그인'}
        </button>
      </form>
      <p className="hint">
        계정이 없으신가요? <Link href="/signup">회원가입</Link>
      </p>
    </div>
  )
}
