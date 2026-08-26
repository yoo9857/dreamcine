'use client'

import { LoginSchema, type LoginInput } from '@aidream/core'
import { Button, Input, Stack } from '@aidream/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'

import { staticMessageFor } from '@/src/lib/error-messages'
import { messages } from '@/src/lib/messages'
import { zodResolver } from '@/src/lib/zod-resolver'

export function LoginForm(): ReactNode {
  const text = messages()
  const router = useRouter()
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
      setFailure(staticMessageFor('E_AUTH_INVALID_CREDENTIALS'))
      return
    }

    const next = new URL(window.location.href).searchParams.get('next')
    const destination =
      next?.startsWith('/') === true && !next.startsWith('//') ? next : '/'
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
      className="w-full max-w-md rounded-lg border border-border-subtle bg-bg-elevated p-8"
    >
      <Stack gap={6}>
        <h1 className="text-xl font-semibold text-fg">
          {text.auth.loginTitle}
        </h1>

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
            label={text.auth.email}
            type="email"
            autoComplete="email"
            {...(errors.email?.message === undefined
              ? {}
              : { error: errors.email.message })}
            {...register('email')}
          />
          <Input
            label={text.auth.password}
            type="password"
            autoComplete="current-password"
            {...(errors.password?.message === undefined
              ? {}
              : { error: errors.password.message })}
            {...register('password')}
          />
        </Stack>

        <Button type="submit" loading={isSubmitting} fullWidth>
          {isSubmitting ? text.auth.loginSubmitting : text.auth.loginSubmit}
        </Button>

        <p className="text-center text-sm text-fg-secondary">
          {text.auth.noAccount}{' '}
          <Link href="/signup" className="font-medium text-accent">
            {text.auth.toSignup}
          </Link>
        </p>
      </Stack>
    </form>
  )
}
