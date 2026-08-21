import type { ReactNode } from 'react'

import { SignupForm } from '@/src/components/auth/SignupForm'

export default function SignupPage(): ReactNode {
  return (
    <main className="auth-shell">
      <SignupForm />
    </main>
  )
}
