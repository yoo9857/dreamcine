import type { ReactNode } from 'react'

import { AuthRecoveryShell } from '@/src/components/auth/AuthRecoveryShell'
import { ResetPasswordForm } from '@/src/components/auth/ResetPasswordForm'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ lang?: string; token?: string }>
}): Promise<ReactNode> {
  const { lang, token } = await searchParams
  const english = lang === 'en'
  return (
    <AuthRecoveryShell english={english}>
      <ResetPasswordForm locale={english ? 'en' : 'ko'} token={token ?? ''} />
    </AuthRecoveryShell>
  )
}
