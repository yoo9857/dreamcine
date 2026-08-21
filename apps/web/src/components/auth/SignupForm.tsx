'use client'

import { SignupSchema, type SignupInput } from '@aidream/core'
import { Button, EmptyState, Input, Stack } from '@aidream/ui'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'

import { readApiError, staticMessageFor } from '@/src/lib/error-messages'
import { messages } from '@/src/lib/messages'
import { zodResolver } from '@/src/lib/zod-resolver'

interface SentState {
  email: string
}

export function SignupForm(): ReactNode {
  const text = messages()
  const [sent, setSent] = useState<SentState | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { email: '', password: '', handle: '', displayName: '' },
  })

  async function submit(values: SignupInput): Promise<void> {
    setFailure(null)

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
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
      <div className="w-full max-w-md">
        <EmptyState
          icon={<MailCheck aria-hidden="true" className="size-8" />}
          title={text.auth.signupSentTitle}
          description={text.auth.signupSentBody(sent.email)}
          action={
            <Button variant="secondary" asChild>
              <Link href="/login" data-testid="signup-sent">
                {text.auth.toLogin}
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(submit)(event)
      }}
      className="w-full max-w-md rounded-lg border border-border-subtle bg-bg-elevated p-8"
    >
      <Stack gap={6}>
        <h1 className="text-xl font-semibold text-fg">
          {text.auth.signupTitle}
        </h1>

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
            label={text.auth.email}
            type="email"
            autoComplete="email"
            {...(errors.email?.message === undefined
              ? {}
              : { error: errors.email.message })}
            {...register('email')}
          />
          <Input
            label={text.auth.handle}
            hint={text.auth.handleHint}
            autoComplete="username"
            {...(errors.handle?.message === undefined
              ? {}
              : { error: errors.handle.message })}
            {...register('handle')}
          />
          <Input
            label={text.auth.displayName}
            autoComplete="nickname"
            {...(errors.displayName?.message === undefined
              ? {}
              : { error: errors.displayName.message })}
            {...register('displayName')}
          />
          <Input
            label={text.auth.password}
            type="password"
            autoComplete="new-password"
            {...(errors.password?.message === undefined
              ? {}
              : { error: errors.password.message })}
            {...register('password')}
          />
        </Stack>

        <Button type="submit" loading={isSubmitting} fullWidth>
          {isSubmitting ? text.auth.signupSubmitting : text.auth.signupSubmit}
        </Button>

        <p className="text-center text-sm text-fg-secondary">
          {text.auth.hasAccount}{' '}
          <Link href="/login" className="font-medium text-accent">
            {text.auth.loginTitle}
          </Link>
        </p>
      </Stack>
    </form>
  )
}
