'use client'

import { LoginSchema, type LoginInput } from '@aidream/core'
import { Button, Input, Stack } from '@aidream/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import React, { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'

import { staticMessageFor } from '@/src/lib/error-messages'
import { messages } from '@/src/lib/messages'
import { zodResolver } from '@/src/lib/zod-resolver'

export function LoginForm({
  locale = 'ko',
  nextPath,
}: {
  readonly locale?: 'ko' | 'en'
  readonly nextPath?: string
}): ReactNode {
  const text = messages()
  const copy =
    locale === 'en'
      ? {
          title: 'Sign in',
          subtitle: 'Pick up right where your story left off.',
          email: 'Email or username',
          identifierPlaceholder: 'Email or username',
          password: 'Password',
          passwordPlaceholder: 'Enter your password',
          submitting: 'Signing in…',
          submit: 'Sign in',
          noAccount: 'New to ilog?',
          toSignup: 'Create an account',
          invalid: 'The email or password you entered is incorrect.',
        }
      : {
          title: text.auth.loginTitle,
          subtitle: '다시, 당신의 취향이 이어지는 곳으로.',
          email: '이메일 또는 아이디',
          identifierPlaceholder: '이메일 또는 아이디',
          password: text.auth.password,
          passwordPlaceholder: '비밀번호를 입력하세요',
          submitting: text.auth.loginSubmitting,
          submit: text.auth.loginSubmit,
          noAccount: text.auth.noAccount,
          toSignup: text.auth.toSignup,
          invalid: staticMessageFor('E_AUTH_INVALID_CREDENTIALS'),
        }
  const router = useRouter()
  const safeNextPath =
    nextPath?.startsWith('/') === true && !nextPath.startsWith('//')
      ? nextPath
      : undefined
  const signupHref = `${locale === 'en' ? '/signup?lang=en' : '/signup'}${
    safeNextPath === undefined
      ? ''
      : `${locale === 'en' ? '&' : '?'}next=${encodeURIComponent(safeNextPath)}`
  }`
  const [failure, setFailure] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function submit(values: LoginInput): Promise<void> {
    setFailure(null)

    // 실패 사유를 구분하지 않는다. 서버도 동일 메시지를 쓴다. (07 §11)
    const result = await signIn('credentials', {
      email: values.email,
      password: values.password,
      redirect: false,
    })

    if (!result.ok || result.error !== undefined) {
      setFailure(copy.invalid)
      return
    }

    const next = new URL(window.location.href).searchParams.get('next')
    const destination =
      next?.startsWith('/') === true && !next.startsWith('//')
        ? next
        : '/browse'
    router.push(destination)
    router.refresh()
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
      className="ilog-login-form"
    >
      <Stack gap={6}>
        <header className="ilog-login-form-heading">
          <span>MEMBER ACCESS</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </header>

        {failure === null ? null : (
          <p
            role="alert"
            data-testid="login-error"
            className="rounded-md border border-danger bg-danger-subtle px-3 py-2 text-sm text-fg"
          >
            {failure}
          </p>
        )}

        <Stack gap={4}>
          <Input
            label={copy.email}
            type="text"
            size="lg"
            autoComplete="username"
            placeholder={copy.identifierPlaceholder}
            className="ilog-login-input"
            {...(errors.email?.message === undefined
              ? {}
              : { error: errors.email.message })}
            {...register('email')}
          />
          <Input
            label={copy.password}
            type="password"
            size="lg"
            autoComplete="current-password"
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
          {isSubmitting ? copy.submitting : copy.submit}
        </Button>

        <div className="ilog-login-divider">
          <span>{copy.noAccount}</span>
        </div>

        <Link href={signupHref} className="ilog-login-signup-link">
          {copy.toSignup} <span aria-hidden="true">→</span>
        </Link>
      </Stack>
    </form>
  )
}
