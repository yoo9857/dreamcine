import type { ReactNode } from 'react'

import { AccountDeletionRecovery } from '@/src/components/auth/AccountDeletionRecovery'
import { AuthRecoveryShell } from '@/src/components/auth/AuthRecoveryShell'

export const dynamic = 'force-dynamic'

export default async function AccountDeletionCancelPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ lang?: string; token?: string }>
}): Promise<ReactNode> {
  const { lang, token } = await searchParams
  const english = lang === 'en'
  return (
    <AuthRecoveryShell english={english}>
      <AccountDeletionRecovery english={english} token={token ?? ''} />
    </AuthRecoveryShell>
  )
}
