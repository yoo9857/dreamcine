import type { ReactNode } from 'react'

import { LoginForm } from '@/src/components/auth/LoginForm'

export default function LoginPage(): ReactNode {
  return (
    <main className="auth-shell">
      <LoginForm />
    </main>
  )
}
