'use client'

import { Button, EmptyState, ErrorState, Spinner, Stack } from '@aidream/ui'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState, type ReactNode } from 'react'

import { readApiError, staticMessageFor } from '@/src/lib/error-messages'
import { messages } from '@/src/lib/messages'

import { VerificationResendForm } from './VerificationResendForm'

type VerifyState = 'checking' | 'success' | 'expired' | 'error'

interface Outcome {
  state: VerifyState
  message: string | null
  userId: string | null
}

const VERIFICATION_EVENT_KEY = 'ilog:email-verification-complete'
const VERIFICATION_CHANNEL = 'ilog-email-verification'

const verificationRequests = new Map<string, Promise<Outcome>>()

async function requestVerification(token: string): Promise<Outcome> {
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (response.ok) {
      const result = (await response.json()) as { userId?: string }
      return {
        state: 'success',
        message: null,
        userId: result.userId ?? null,
      }
    }
    const problem = readApiError(await response.json().catch(() => null))
    return {
      state: problem?.code === 'E_VALIDATION' ? 'expired' : 'error',
      message: problem?.message ?? staticMessageFor('E_INTERNAL'),
      userId: null,
    }
  } catch {
    return {
      state: 'error',
      message: staticMessageFor('E_INTERNAL'),
      userId: null,
    }
  }
}

function verifyOnce(token: string): Promise<Outcome> {
  const pending = verificationRequests.get(token)
  if (pending !== undefined) return pending

  const request = requestVerification(token)
  verificationRequests.set(token, request)
  void request.finally(() => {
    window.setTimeout(() => {
      if (verificationRequests.get(token) === request) {
        verificationRequests.delete(token)
      }
    }, 5_000)
  })
  return request
}

export function VerifyStatus(): ReactNode {
  const text = messages()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const plan =
    searchParams.get('plan') === 'ads-standard' ? 'ads-standard' : null
  const locale = searchParams.get('lang') === 'en' ? 'en' : 'ko'
  const market = searchParams.get('market') === 'us' ? 'us' : 'kr'
  const planReturnPath = `/ads-plan?lang=${locale}&market=${market}#join`
  const loginHref =
    plan === null
      ? locale === 'en'
        ? '/login?lang=en'
        : '/login'
      : `/login?lang=${locale}&next=${encodeURIComponent(planReturnPath)}`
  const [outcome, setOutcome] = useState<Outcome>({
    state: 'checking',
    message: null,
    userId: null,
  })
  const [showResend, setShowResend] = useState(false)

  useEffect(() => {
    if (token === null || token === '') {
      setOutcome({
        state: 'expired',
        message: staticMessageFor('E_VALIDATION'),
        userId: null,
      })
      return
    }

    let cancelled = false
    /*
      좁혀진 `token` 을 지역 const 로 받는다. `verify` 는 함수 선언(호이스팅)
      이라 TypeScript 가 위의 early return narrowing 을 적용하지 않는다 —
      선언은 좁혀지기 전에도 호출될 수 있기 때문이다.
    */
    const verifyToken = token

    async function verify(): Promise<void> {
      const result = await verifyOnce(verifyToken)
      if (cancelled) {
        return
      }
      // 토큰 만료·무효는 둘 다 E_VALIDATION 이다. 화면은 재발송을 안내한다.
      setOutcome(result)
    }

    void verify()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (outcome.state !== 'success') return
    if (outcome.userId !== null) {
      const payload = JSON.stringify({
        userId: outcome.userId,
        verifiedAt: Date.now(),
      })
      try {
        window.localStorage.setItem(VERIFICATION_EVENT_KEY, payload)
      } catch (error: unknown) {
        // 사생활 보호 모드 등으로 저장소가 막혀도 현재 탭 자동 이동은 유지한다.
        void error
      }
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(VERIFICATION_CHANNEL)
        channel.postMessage({ userId: outcome.userId })
        channel.close()
      }
    }
    const timer = window.setTimeout(() => {
      router.replace(loginHref)
      router.refresh()
    }, 1_200)
    return () => {
      window.clearTimeout(timer)
    }
  }, [loginHref, outcome.state, outcome.userId, router])

  if (outcome.state === 'checking') {
    return (
      <div className="ilog-verify-card" role="status" aria-live="polite">
        <Stack gap={4} align="center">
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
      <div className="ilog-verify-card" aria-live="polite">
        <EmptyState
          icon={<MailCheck aria-hidden="true" className="size-8" />}
          title={text.auth.verifySuccessTitle}
          description={
            locale === 'en'
              ? 'Verification is complete. Taking you to sign in…'
              : '이메일 인증이 완료되었습니다. 로그인 화면으로 이동합니다…'
          }
          action={
            <Button asChild>
              <Link href={loginHref} data-testid="verify-success">
                {locale === 'en' ? 'Continue now' : '지금 이동하기'}
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="ilog-verify-card" data-testid="verify-error">
      <ErrorState
        title={
          outcome.state === 'expired'
            ? text.auth.verifyExpiredTitle
            : text.auth.verifyFailedTitle
        }
        description={outcome.message ?? staticMessageFor('E_INTERNAL')}
        retryLabel={
          outcome.state === 'expired'
            ? text.auth.resendVerification
            : locale === 'en'
              ? 'Try again'
              : '다시 확인하기'
        }
        onRetry={() => {
          if (outcome.state === 'expired') {
            setShowResend(true)
            return
          }
          window.location.reload()
        }}
      />
      {showResend ? <VerificationResendForm locale={locale} /> : null}
    </div>
  )
}
