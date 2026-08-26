'use client'

import { SignupSchema, type SignupInput } from '@aidream/core'
import { Button, EmptyState, Input, Stack } from '@aidream/ui'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import React, { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'

import { readApiError, staticMessageFor } from '@/src/lib/error-messages'
import { messages } from '@/src/lib/messages'
import { zodResolver } from '@/src/lib/zod-resolver'

interface SentState {
  email: string
}

export function SignupForm({
  initialEmail = '',
  locale = 'ko',
  market = 'kr',
  plan,
}: {
  readonly initialEmail?: string
  readonly locale?: 'ko' | 'en'
  readonly market?: 'kr' | 'us'
  readonly plan?: 'ads-standard'
}): ReactNode {
  const text = messages()
  const copy =
    locale === 'en'
      ? {
          signupTitle: 'Create your ilog account',
          subtitle: 'Create an account and begin your first scene.',
          email: 'Email address',
          handle: 'Username',
          handleHint: 'Use letters, numbers, periods, or underscores.',
          handlePlaceholder: 'Your ilog username',
          displayName: 'Display name',
          displayNamePlaceholder: 'The name people will see',
          password: 'Password',
          passwordPlaceholder: 'Create a secure password',
          signupSubmitting: 'Creating your account…',
          signupSubmit: 'Create account',
          hasAccount: 'Already have an account?',
          loginTitle: 'Sign in',
          toLogin: 'Go to sign in',
          signupSentTitle: 'Check your inbox',
          signupSentBody: (email: string) =>
            `We sent a verification link to ${email}.`,
        }
      : {
          ...text.auth,
          subtitle: '계정을 만들고, 첫 번째 장면을 시작하세요.',
          handlePlaceholder: 'ilog에서 사용할 아이디',
          displayNamePlaceholder: '사람들에게 보여질 이름',
          passwordPlaceholder: '안전한 비밀번호를 입력하세요',
        }
  const [sent, setSent] = useState<SentState | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const planReturnPath = `/ads-plan?lang=${locale}&market=${market}#join`
  const loginHref =
    plan === undefined
      ? locale === 'en'
        ? '/login?lang=en'
        : '/login'
      : `/login?lang=${locale}&next=${encodeURIComponent(planReturnPath)}`
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      email: initialEmail,
      password: '',
      handle: '',
      displayName: '',
    },
  })

  async function submit(values: SignupInput): Promise<void> {
    setFailure(null)

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...values,
        ...(plan === undefined ? {} : { plan }),
        lang: locale,
        market,
      }),
    })

    if (response.ok) {
      setSent({ email: values.email })
      return
    }

    const problem = readApiError(await response.json().catch(() => null))
    // 서버가 필드를 지목하면 그 입력 아래에 붙인다. 그래야 어디를 고칠지 안다.
    for (const [field, message] of Object.entries(problem?.fields ?? {})) {
      if (
        field === 'email' ||
        field === 'password' ||
        field === 'handle' ||
        field === 'displayName'
      ) {
        setError(field, { type: 'server', message })
      }
    }
    setFailure(problem?.message ?? staticMessageFor('E_INTERNAL'))
  }

  if (sent !== null) {
    return (
      <div className="ilog-signup-sent">
        <EmptyState
          icon={<MailCheck aria-hidden="true" className="size-8" />}
          title={copy.signupSentTitle}
          description={copy.signupSentBody(sent.email)}
          action={
            <Button variant="secondary" asChild>
              <Link href={loginHref} data-testid="signup-sent">
                {copy.toLogin}
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <form
      /*
        브라우저 기본 검증을 끈다. `type="email"` 필드에 잘못된 값이 있으면
        Chrome 이 제출 자체를 막고 자기 말풍선을 띄우는데, 그러면 우리
        검증(zod)이 실행되지 않아 `aria-invalid`·`aria-describedby`·화면 문구가
        전부 생기지 않는다. 08_UIUX_SPEC.md §10 이 요구하는 "어디를 고쳐야
        하는지 알 수 있어야 한다" 를 브라우저 말풍선이 대신할 수 없다 —
        스타일도 문구도 우리가 통제하지 못하고 스크린리더 지원도 제각각이다.
      */
      noValidate
      onSubmit={(event) => {
        void handleSubmit(submit)(event)
      }}
      className="ilog-login-form ilog-signup-form"
    >
      <Stack gap={6}>
        <header className="ilog-login-form-heading">
          <span>CREATOR ENTRY</span>
          <h1>{copy.signupTitle}</h1>
          <p>{copy.subtitle}</p>
        </header>

        {plan === undefined ? null : (
          <div
            className="ilog-signup-selected-plan"
            data-testid="selected-plan"
          >
            <span>{locale === 'en' ? 'SELECTED PLAN' : '선택한 멤버십'}</span>
            <strong>
              {locale === 'en' ? 'Standard with ads' : '광고형 스탠다드'}
            </strong>
            <small>{market === 'us' ? '$4.99 / month' : '월 6,900원'}</small>
          </div>
        )}

        {failure === null ? null : (
          <p
            role="alert"
            data-testid="signup-error"
            className="rounded-md border border-danger bg-danger-subtle px-3 py-2 text-sm text-fg"
          >
            {failure}
          </p>
        )}

        <Stack gap={4}>
          <Input
            label={copy.email}
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
          <Input
            label={copy.handle}
            hint={copy.handleHint}
            size="lg"
            autoComplete="username"
            placeholder={copy.handlePlaceholder}
            className="ilog-login-input"
            {...(errors.handle?.message === undefined
              ? {}
              : { error: errors.handle.message })}
            {...register('handle')}
          />
          <Input
            label={copy.displayName}
            size="lg"
            autoComplete="nickname"
            placeholder={copy.displayNamePlaceholder}
            className="ilog-login-input"
            {...(errors.displayName?.message === undefined
              ? {}
              : { error: errors.displayName.message })}
            {...register('displayName')}
          />
          <Input
            label={copy.password}
            type="password"
            size="lg"
            autoComplete="new-password"
            placeholder={copy.passwordPlaceholder}
            className="ilog-login-input"
            {...(errors.password?.message === undefined
              ? {}
              : { error: errors.password.message })}
            {...register('password')}
          />
        </Stack>

        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          fullWidth
          className="ilog-login-submit"
        >
          {isSubmitting ? copy.signupSubmitting : copy.signupSubmit}
        </Button>

        <div className="ilog-login-divider">
          <span>{copy.hasAccount}</span>
        </div>

        <Link href={loginHref} className="ilog-login-signup-link">
          {copy.loginTitle} <span aria-hidden="true">→</span>
        </Link>
      </Stack>
    </form>
  )
}
