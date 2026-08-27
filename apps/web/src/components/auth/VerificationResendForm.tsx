'use client'

import {
  RequestPasswordResetSchema,
  type RequestPasswordResetInput,
} from '@aidream/core'
import { Button, Input, Stack } from '@aidream/ui'
import React, { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'

import { readApiError, staticMessageFor } from '@/src/lib/error-messages'
import { zodResolver } from '@/src/lib/zod-resolver'

export function VerificationResendForm({
  locale,
}: {
  readonly locale: 'ko' | 'en'
}): ReactNode {
  const english = locale === 'en'
  const [accepted, setAccepted] = useState(false)
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
    const response = await fetch('/api/auth/verification/resend', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (response.ok) {
      setAccepted(true)
      return
    }
    const problem = readApiError(await response.json().catch(() => null))
    setFailure(problem?.message ?? staticMessageFor('E_INTERNAL'))
  }

  if (accepted) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-fg-secondary">
        {english
          ? 'Request accepted. Check your inbox and spam folder.'
          : '발송 요청을 접수했습니다. 받은편지함과 스팸함을 확인해 주세요.'}
      </p>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(submit)(event)}
      className="w-full"
    >
      <Stack gap={3}>
        <Input
          label={english ? 'Email address' : '이메일 주소'}
          hint={
            english
              ? 'Enter the address used when you signed up.'
              : '가입할 때 사용한 실제 이메일 주소를 입력해 주세요.'
          }
          type="email"
          autoComplete="email"
          placeholder="name@domain.com"
          {...(errors.email?.message === undefined
            ? {}
            : { error: errors.email.message })}
          {...register('email')}
        />
        {failure === null ? null : (
          <p role="alert" className="text-sm text-danger">
            {failure}
          </p>
        )}
        <Button type="submit" loading={isSubmitting} fullWidth>
          {english ? 'Send a new verification link' : '새 인증 링크 보내기'}
        </Button>
      </Stack>
    </form>
  )
}
