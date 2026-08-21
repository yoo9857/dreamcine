'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { readApiError, staticMessageFor } from '@/src/lib/error-messages'

type VerifyState = 'checking' | 'success' | 'expired' | 'error'

export function VerifyStatus(): ReactNode {
  const token = useSearchParams().get('token')
  const [state, setState] = useState<VerifyState>('checking')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (token === null || token === '') {
      setState('expired')
      setMessage(staticMessageFor('E_VALIDATION'))
      return
    }

    let cancelled = false

    async function verify(): Promise<void> {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (cancelled) {
        return
      }
      if (response.ok) {
        setState('success')
        return
      }
      const failure = readApiError(await response.json().catch(() => null))
      // 토큰 만료·무효는 둘 다 E_VALIDATION 이다. 화면은 재발송을 안내한다.
      setState(failure?.code === 'E_VALIDATION' ? 'expired' : 'error')
      setMessage(failure?.message ?? staticMessageFor('E_INTERNAL'))
    }

    void verify()
    return () => {
      cancelled = true
    }
  }, [token])

  if (state === 'checking') {
    return (
      <div className="auth-card">
        <h1>인증 확인 중…</h1>
        <p className="hint" data-testid="verify-checking">
          잠시만 기다려 주세요.
        </p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="auth-card">
        <h1>이메일 인증 완료</h1>
        <p className="hint" data-testid="verify-success">
          이제 로그인할 수 있습니다.
        </p>
        <p className="hint">
          <Link href="/login">로그인으로 이동</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <h1>
        {state === 'expired' ? '인증 링크가 만료되었습니다' : '인증 실패'}
      </h1>
      <p className="error" role="alert" data-testid="verify-error">
        {message ?? staticMessageFor('E_INTERNAL')}
      </p>
      <p className="hint">
        <Link href="/signup">인증 메일 다시 받기</Link>
      </p>
    </div>
  )
}
