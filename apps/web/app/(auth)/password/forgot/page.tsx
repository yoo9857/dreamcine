import type { ReactNode } from 'react'

import { AuthRecoveryShell } from '@/src/components/auth/AuthRecoveryShell'
import { ForgotPasswordForm } from '@/src/components/auth/ForgotPasswordForm'

export const dynamic = 'force-dynamic'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ lang?: string }>
}): Promise<ReactNode> {
  const english = (await searchParams).lang === 'en'
  return (
    <AuthRecoveryShell english={english}>
      <ForgotPasswordForm locale={english ? 'en' : 'ko'} />
    </AuthRecoveryShell>
  )
}
