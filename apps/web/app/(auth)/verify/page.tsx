import type { ReactNode } from 'react'

import { VerifyStatus } from '@/src/components/auth/VerifyStatus'

export default function VerifyPage(): ReactNode {
  return (
    <main className="auth-shell">
      <VerifyStatus />
    </main>
  )
}
