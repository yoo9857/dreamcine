'use client'

import { Button, EmptyState, ErrorState, Spinner, Stack } from '@aidream/ui'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

import { readApiError, staticMessageFor } from '@/src/lib/error-messages'
import { messages } from '@/src/lib/messages'

type VerifyState = 'checking' | 'success' | 'expired' | 'error'

interface Outcome {
  state: VerifyState
  message: string | null
}

export function VerifyStatus(): ReactNode {
  const text = messages()
  const token = useSearchParams().get('token')
  const [outcome, setOutcome] = useState<Outcome>({
    state: 'checking',
    message: null,
  })

  useEffect(() => {
    if (token === null || token === '') {
      setOutcome({
        state: 'expired',
        message: staticMessageFor('E_VALIDATION'),
      })
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
        setOutcome({ state: 'success', message: null })
        return
      }
      const problem = readApiError(await response.json().catch(() => null))
      // 토큰 만료·무효는 둘 다 E_VALIDATION 이다. 화면은 재발송을 안내한다.
      setOutcome({
        state: problem?.code === 'E_VALIDATION' ? 'expired' : 'error',
        message: problem?.message ?? staticMessageFor('E_INTERNAL'),
      })
    }

    void verify()
    return () => {
      cancelled = true
    }
  }, [token])

  if (outcome.state === 'checking') {
    return (
      <div className="w-full max-w-md">
        <Stack gap={3} align="center">
          <Spinner size="lg" label={text.auth.verifyChecking} />
          <p
            data-testid="verify-checking"
            className="text-sm text-fg-secondary"
          >
            {text.auth.verifyChecking}
          </p>
        </Stack>
      </div>
    )
  }

  if (outcome.state === 'success') {
    return (
      <div className="w-full max-w-md">
        <EmptyState
          icon={<MailCheck aria-hidden="true" className="size-8" />}
          title={text.auth.verifySuccessTitle}
          description={text.auth.verifySuccessBody}
          action={
            <Button asChild>
              <Link href="/login" data-testid="verify-success">
                {text.auth.toLogin}
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="w-full max-w-md" data-testid="verify-error">
      <ErrorState
        title={
          outcome.state === 'expired'
            ? text.auth.verifyExpiredTitle
            : text.auth.verifyFailedTitle
        }
        description={outcome.message ?? staticMessageFor('E_INTERNAL')}
        retryLabel={text.auth.resendVerification}
        onRetry={() => {
          window.location.assign('/signup')
        }}
      />
    </div>
  )
}
