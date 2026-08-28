'use client'

import { Button, EmptyState, Stack } from '@aidream/ui'
import { RotateCcw, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { readApiError, staticMessageFor } from '@/src/lib/error-messages'

export function AccountDeletionRecovery({
  english,
  token,
}: {
  readonly english: boolean
  readonly token: string
}): ReactNode {
  const [restored, setRestored] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  async function restore(): Promise<void> {
    if (token === '' || saving) return
    setSaving(true)
    setFailure(null)
    try {
      const response = await fetch('/api/account/deletion/cancel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!response.ok) {
        const problem = readApiError(await response.json().catch(() => null))
        throw new Error(
          problem?.code === 'E_VALIDATION'
            ? english
              ? 'This recovery link is invalid, expired, or has already been used.'
              : '복구 링크가 유효하지 않거나 만료되었거나 이미 사용되었습니다.'
            : (problem?.message ?? staticMessageFor('E_INTERNAL')),
        )
      }
      setRestored(true)
    } catch (error: unknown) {
      setFailure(
        error instanceof Error ? error.message : staticMessageFor('E_INTERNAL'),
      )
    } finally {
      setSaving(false)
    }
  }

  if (restored) {
    return (
      <div className="ilog-verify-card" aria-live="polite">
        <EmptyState
          icon={<ShieldCheck aria-hidden="true" className="size-8" />}
          title={english ? 'Account restored' : '계정이 복구되었습니다'}
          description={
            english
              ? 'Your profile and works are visible again. Sign in to continue.'
              : '프로필과 작품이 다시 공개되었습니다. 계속하려면 새로 로그인해 주세요.'
          }
          action={
            <Button asChild>
              <Link
                href={
                  english ? '/login?lang=en&restored=1' : '/login?restored=1'
                }
              >
                {english ? 'Sign in' : '로그인하기'}
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <section className="ilog-login-form" aria-labelledby="recovery-title">
      <Stack gap={6}>
        <header className="ilog-login-form-heading">
          <span>ACCOUNT RECOVERY</span>
          <h1 id="recovery-title">
            {english ? 'Restore your account' : '계정을 다시 복구할까요?'}
          </h1>
          <p>
            {english
              ? 'Deletion will be cancelled and the profile and works hidden by the request will be restored.'
              : '탈퇴 예약을 취소하고, 탈퇴 요청으로 비공개된 프로필과 작품을 다시 복구합니다.'}
          </p>
        </header>

        <div className="account-recovery-note">
          <ShieldCheck aria-hidden="true" />
          <p>
            {english
              ? 'For security, previous sessions stay signed out. Existing uploads that were already cancelled will not resume automatically.'
              : '보안을 위해 기존 로그인은 해제된 상태로 유지됩니다. 이미 중단된 업로드는 자동으로 재개되지 않습니다.'}
          </p>
        </div>

        {failure === null ? null : (
          <p className="account-recovery-error" role="alert">
            {failure}
          </p>
        )}

        <Button
          type="button"
          size="lg"
          fullWidth
          loading={saving}
          disabled={token === ''}
          className="ilog-login-submit"
          onClick={() => void restore()}
        >
          <RotateCcw aria-hidden="true" />
          {english ? 'Restore account' : '계정 복구하기'}
        </Button>
        <Link href="/" className="ilog-login-signup-link">
          {english ? 'Return home' : '홈으로 돌아가기'}
        </Link>
      </Stack>
    </section>
  )
}
