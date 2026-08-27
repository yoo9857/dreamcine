'use client'

import { SignupSchema, type SignupInput } from '@aidream/core'
import { Button, Checkbox, EmptyState, Input, Select, Stack } from '@aidream/ui'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import React, { useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { readApiError, staticMessageFor } from '@/src/lib/error-messages'
import { messages } from '@/src/lib/messages'
import { zodResolver } from '@/src/lib/zod-resolver'

interface SentState {
  email: string
  verificationEmailSent: boolean
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
          emailConfirmation: 'Confirm email address',
          verificationHint:
            'We will send a secure verification link after you create your account.',
          handle: 'Username',
          handleHint: 'Use letters, numbers, periods, or underscores.',
          handlePlaceholder: 'Your ilog username',
          displayName: 'Display name',
          displayNamePlaceholder: 'The name people will see',
          password: 'Password',
          passwordPlaceholder: 'Create a secure password',
          birthDate: 'Date of birth',
          profileSurvey: 'Tell us about yourself',
          profileSurveyHint:
            'Used for age-appropriate viewing and product improvements.',
          gender: 'Gender',
          genderOptions: [
            { value: 'FEMALE', label: 'Woman' },
            { value: 'MALE', label: 'Man' },
            { value: 'NON_BINARY', label: 'Non-binary' },
            { value: 'OTHER', label: 'Self-described / other' },
            { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
          ],
          signupPurpose: 'How will you use ilog?',
          purposeOptions: [
            { value: 'VIEWER', label: 'Watch and discover' },
            { value: 'CREATOR', label: 'Create and publish' },
            { value: 'BOTH', label: 'Both' },
          ],
          country: 'Country or region',
          countryOptions: [
            { value: 'KR', label: 'South Korea' },
            { value: 'US', label: 'United States' },
            { value: 'CN', label: 'China' },
            { value: 'JP', label: 'Japan' },
          ],
          acceptTerms:
            'I agree to the Terms of Use and Privacy Policy. (Required)',
          marketingConsent:
            'I agree to receive product news and marketing emails. (Optional)',
          marketingHint: 'You can withdraw this consent at any time.',
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
          emailConfirmation: '이메일 주소 확인',
          verificationHint:
            '가입 완료 후 안전한 이메일 인증 링크를 보내드립니다.',
          birthDate: '생년월일',
          profileSurvey: '회원 정보',
          profileSurveyHint:
            '연령에 맞는 시청 환경과 서비스 개선을 위해 사용합니다.',
          gender: '성별',
          genderOptions: [
            { value: 'FEMALE', label: '여성' },
            { value: 'MALE', label: '남성' },
            { value: 'NON_BINARY', label: '논바이너리' },
            { value: 'OTHER', label: '기타' },
            { value: 'PREFER_NOT_TO_SAY', label: '응답하지 않음' },
          ],
          signupPurpose: 'ilog를 어떻게 이용하실 예정인가요?',
          purposeOptions: [
            { value: 'VIEWER', label: '시청자' },
            { value: 'CREATOR', label: '크리에이터' },
            { value: 'BOTH', label: '시청자이자 크리에이터' },
          ],
          country: '국가 또는 지역',
          countryOptions: [
            { value: 'KR', label: '대한민국' },
            { value: 'US', label: '미국' },
            { value: 'CN', label: '중국' },
            { value: 'JP', label: '일본' },
          ],
          acceptTerms: '이용약관 및 개인정보 처리방침에 동의합니다. (필수)',
          marketingConsent:
            '서비스 소식 및 마케팅 이메일 수신에 동의합니다. (선택)',
          marketingHint:
            '동의하지 않아도 가입할 수 있으며 언제든 철회할 수 있습니다.',
          subtitle: '계정을 만들고, 첫 번째 장면을 시작하세요.',
          handlePlaceholder: 'ilog에서 사용할 아이디',
          displayNamePlaceholder: '사람들에게 보여질 이름',
          passwordPlaceholder: '안전한 비밀번호를 입력하세요',
        }
  const [sent, setSent] = useState<SentState | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [resendState, setResendState] = useState<
    'idle' | 'sending' | 'accepted'
  >('idle')
  const planReturnPath = `/ads-plan?lang=${locale}&market=${market}#join`
  const loginHref =
    plan === undefined
      ? locale === 'en'
        ? '/login?lang=en'
        : '/login'
      : `/login?lang=${locale}&next=${encodeURIComponent(planReturnPath)}`
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      email: initialEmail,
      emailConfirmation: initialEmail,
      password: '',
      handle: '',
      displayName: '',
      gender: 'PREFER_NOT_TO_SAY',
      signupPurpose: 'VIEWER',
      country: market === 'us' ? 'US' : 'KR',
      acceptTerms: false,
      marketingConsent: false,
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
      const result = (await response.json()) as {
        verificationEmailSent?: boolean
      }
      setSent({
        email: values.email,
        verificationEmailSent: result.verificationEmailSent === true,
      })
      return
    }

    const problem = readApiError(await response.json().catch(() => null))
    // 서버가 필드를 지목하면 그 입력 아래에 붙인다. 그래야 어디를 고칠지 안다.
    for (const [field, message] of Object.entries(problem?.fields ?? {})) {
      if (
        field === 'email' ||
        field === 'emailConfirmation' ||
        field === 'password' ||
        field === 'handle' ||
        field === 'displayName' ||
        field === 'birthDate' ||
        field === 'gender' ||
        field === 'signupPurpose' ||
        field === 'country' ||
        field === 'acceptTerms' ||
        field === 'marketingConsent'
      ) {
        setError(field, { type: 'server', message })
      }
    }
    setFailure(problem?.message ?? staticMessageFor('E_INTERNAL'))
  }

  async function resend(email: string): Promise<void> {
    setResendState('sending')
    try {
      await fetch('/api/auth/verification/resend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } finally {
      setResendState('accepted')
    }
  }

  if (sent !== null) {
    return (
      <div className="ilog-signup-sent">
        <EmptyState
          icon={<MailCheck aria-hidden="true" className="size-8" />}
          title={
            sent.verificationEmailSent
              ? copy.signupSentTitle
              : locale === 'en'
                ? 'Your account was created'
                : '계정이 생성되었습니다'
          }
          description={
            sent.verificationEmailSent
              ? copy.signupSentBody(sent.email)
              : locale === 'en'
                ? 'Email delivery is temporarily unavailable. You can sign in now and request verification again later.'
                : '현재 인증 메일 발송을 준비하고 있습니다. 먼저 로그인한 뒤 인증 메일을 다시 요청할 수 있습니다.'
          }
          action={
            <div className="ilog-auth-actions">
              <Button variant="secondary" asChild>
                <Link href={loginHref} data-testid="signup-sent">
                  {copy.toLogin}
                </Link>
              </Button>
              {resendState === 'accepted' ? (
                <p role="status">
                  {locale === 'en'
                    ? 'Request accepted. Check your inbox and spam folder.'
                    : '발송 요청을 접수했습니다. 받은편지함과 스팸함을 확인해 주세요.'}
                </p>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  loading={resendState === 'sending'}
                  onClick={() => void resend(sent.email)}
                >
                  {locale === 'en'
                    ? 'Resend verification'
                    : '인증메일 다시 받기'}
                </Button>
              )}
            </div>
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
          <div className="ilog-signup-section-heading">
            <strong>
              {locale === 'en' ? 'Email verification' : '이메일 인증'}
            </strong>
            <span>{copy.verificationHint}</span>
          </div>
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
            label={copy.emailConfirmation}
            type="email"
            size="lg"
            autoComplete="email"
            placeholder="you@example.com"
            className="ilog-login-input"
            {...(errors.emailConfirmation?.message === undefined
              ? {}
              : { error: errors.emailConfirmation.message })}
            {...register('emailConfirmation')}
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
          <div className="ilog-signup-section-heading ilog-signup-survey-heading">
            <strong>{copy.profileSurvey}</strong>
            <span>{copy.profileSurveyHint}</span>
          </div>
          <Input
            label={copy.birthDate}
            type="date"
            size="lg"
            autoComplete="bday"
            max={new Date().toISOString().slice(0, 10)}
            className="ilog-login-input"
            {...(errors.birthDate?.message === undefined
              ? {}
              : { error: errors.birthDate.message })}
            {...register('birthDate')}
          />
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select
                label={copy.gender}
                placeholder={locale === 'en' ? 'Select gender' : '성별 선택'}
                options={copy.genderOptions}
                value={field.value}
                onValueChange={field.onChange}
                {...(errors.gender?.message === undefined
                  ? {}
                  : { error: errors.gender.message })}
              />
            )}
          />
          <Controller
            control={control}
            name="signupPurpose"
            render={({ field }) => (
              <Select
                label={copy.signupPurpose}
                placeholder={
                  locale === 'en' ? 'Select your primary use' : '이용 목적 선택'
                }
                options={copy.purposeOptions}
                value={field.value}
                onValueChange={field.onChange}
                {...(errors.signupPurpose?.message === undefined
                  ? {}
                  : { error: errors.signupPurpose.message })}
              />
            )}
          />
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <Select
                label={copy.country}
                options={copy.countryOptions}
                value={field.value}
                onValueChange={field.onChange}
                {...(errors.country?.message === undefined
                  ? {}
                  : { error: errors.country.message })}
              />
            )}
          />
          <div className="ilog-signup-consents">
            <Controller
              control={control}
              name="acceptTerms"
              render={({ field }) => (
                <Checkbox
                  label={copy.acceptTerms}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  {...(errors.acceptTerms?.message === undefined
                    ? {}
                    : { error: errors.acceptTerms.message })}
                />
              )}
            />
            <p className="ilog-signup-policy-links">
              <Link href="/terms" target="_blank">
                이용약관
              </Link>
              과{' '}
              <Link href="/privacy" target="_blank">
                개인정보 처리방침
              </Link>
              을 확인하세요.
            </p>
            <Controller
              control={control}
              name="marketingConsent"
              render={({ field }) => (
                <Checkbox
                  label={copy.marketingConsent}
                  hint={copy.marketingHint}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
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
