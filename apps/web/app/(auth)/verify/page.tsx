import { Suspense, type ReactNode } from 'react'

import { VerifyStatus } from '@/src/components/auth/VerifyStatus'

export default function VerifyPage(): ReactNode {
  return (
    <main className="auth-shell">
      {/* useSearchParams 를 쓰는 컴포넌트는 Suspense 경계가 필요하다. */}
      <Suspense
        fallback={
          <div className="auth-card">
            <h1>인증 확인 중…</h1>
          </div>
        }
      >
        <VerifyStatus />
      </Suspense>
    </main>
  )
}
