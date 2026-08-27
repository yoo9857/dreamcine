'use client'

import {
  RequestPasswordResetSchema,
  type RequestPasswordResetInput,
} from '@aidream/core'
import { Button, EmptyState, Input, Stack } from '@aidream/ui'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import React, { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'

import { readApiError, staticMessageFor } from '@/src/lib/error-messages'
import { zodResolver } from '@/src/lib/zod-resolver'

export function ForgotPasswordForm({
  locale = 'ko',
}: {
  readonly locale?: 'ko' | 'en'
}): ReactNode {
  const english = locale === 'en'
  const [sent, setSent] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(RequestPasswordResetSchema),
    defaultValues: { email: '' },
  })

  async function submit(values: RequestPasswordResetInput): Promise<void> {
    setFailure(null)
    const response = await fetch('/api/auth/password/forgot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...values, lang: locale }),
    })
    if (response.ok) {
      setSent(true)
      return
    }
    const problem = readApiError(await response.json().catch(() => null))
    setFailure(problem?.message ?? staticMessageFor('E_INTERNAL'))
  }

  if (sent) {
    return (
      <EmptyState
        icon={<MailCheck aria-hidden="true" className="size-8" />}
        title={english ? 'Check your inbox' : '메일함을 확인해 주세요'}
        description={
          english
            ? 'If the account exists, we sent a password reset link. Also check your spam folder.'
            : '가입된 계정이라면 비밀번호 재설정 링크를 보냈습니다. 스팸함도 함께 확인해 주세요.'
        }
        action={
          <Button variant="secondary" asChild>
            <Link href={english ? '/login?lang=en' : '/login'}>
              {english ? 'Back to sign in' : '로그인으로 돌아가기'}
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <form
      noValidate
      className="ilog-login-form"
      onSubmit={(event) => void handleSubmit(submit)(event)}
    >
      <Stack gap={6}>
        <header className="ilog-login-form-heading">
          <span>ACCOUNT RECOVERY</span>
          <h1>{english ? 'Reset password' : '비밀번호 찾기'}</h1>
          <p>
            {english
              ? 'We will send a secure reset link to your email.'
              : '가입한 이메일로 안전한 재설정 링크를 보내드립니다.'}
          </p>
        </header>

        {failure === null ? null : (
          <p
            role="alert"
            className="rounded-md border border-danger bg-danger-subtle px-3 py-2 text-sm text-fg"
          >
            {failure}
          </p>
        )}

        <Input
          label={english ? 'Email address' : '이메일'}
          type="email"
          size="lg"
          autoComplete="email"
          placeholder="you@example.com"
          className="ilog-login-input"
          {...(errors.email?.message === undefined
            ? {}
            : { error: errors.email.message })}
          {...register('email')}
        />
        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          fullWidth
          className="ilog-login-submit"
        >
          {english ? 'Send reset link' : '재설정 링크 보내기'}
        </Button>
        <Link
          href={english ? '/login?lang=en' : '/login'}
          className="ilog-login-signup-link"
        >
          {english ? 'Back to sign in' : '로그인으로 돌아가기'}{' '}
          <span aria-hidden="true">→</span>
        </Link>
      </Stack>
    </form>
  )
}
