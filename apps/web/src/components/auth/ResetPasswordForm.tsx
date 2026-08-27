'use client'

import { ResetPasswordSchema, type ResetPasswordInput } from '@aidream/core'
import { Button, EmptyState, Input, Stack } from '@aidream/ui'
import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'

import { readApiError, staticMessageFor } from '@/src/lib/error-messages'
import { zodResolver } from '@/src/lib/zod-resolver'

export function ResetPasswordForm({
  locale = 'ko',
  token,
}: {
  readonly locale?: 'ko' | 'en'
  readonly token: string
}): ReactNode {
  const english = locale === 'en'
  const [complete, setComplete] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { token, password: '' },
  })

  async function submit(values: ResetPasswordInput): Promise<void> {
    setFailure(null)
    const response = await fetch('/api/auth/password/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (response.ok) {
      setComplete(true)
      return
    }
    const problem = readApiError(await response.json().catch(() => null))
    setFailure(
      problem?.code === 'E_VALIDATION'
        ? english
          ? 'This reset link is invalid or has expired. Request a new one.'
          : '재설정 링크가 유효하지 않거나 만료되었습니다. 새 링크를 요청해 주세요.'
        : (problem?.message ?? staticMessageFor('E_INTERNAL')),
    )
  }

  if (complete) {
    return (
      <EmptyState
        icon={<ShieldCheck aria-hidden="true" className="size-8" />}
        title={english ? 'Password updated' : '비밀번호가 변경되었습니다'}
        description={
          english
            ? 'Your existing sessions have been signed out for security.'
            : '보안을 위해 기존 로그인 세션은 모두 종료되었습니다.'
        }
        action={
          <Button asChild>
            <Link href={english ? '/login?lang=en' : '/login'}>
              {english ? 'Sign in' : '로그인하기'}
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
      <input type="hidden" {...register('token')} />
      <Stack gap={6}>
        <header className="ilog-login-form-heading">
          <span>ACCOUNT SECURITY</span>
          <h1>{english ? 'New password' : '새 비밀번호'}</h1>
          <p>
            {english
              ? 'Choose a secure password you have not used before.'
              : '이전에 사용하지 않은 안전한 비밀번호를 설정해 주세요.'}
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
          label={english ? 'New password' : '새 비밀번호'}
          type="password"
          size="lg"
          autoComplete="new-password"
          className="ilog-login-input"
          {...(errors.password?.message === undefined
            ? {}
            : { error: errors.password.message })}
          {...register('password')}
        />
        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          fullWidth
          className="ilog-login-submit"
          disabled={token === ''}
        >
          {english ? 'Update password' : '비밀번호 변경하기'}
        </Button>
        {token === '' ? (
          <Link
            href={english ? '/password/forgot?lang=en' : '/password/forgot'}
            className="ilog-login-signup-link"
          >
            {english ? 'Request a new link' : '새 링크 요청하기'}{' '}
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </Stack>
    </form>
  )
}
