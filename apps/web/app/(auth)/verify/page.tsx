import { Suspense, type ReactNode } from 'react'

import { VerifyStatus } from '@/src/components/auth/VerifyStatus'

/**
 * CSP nonce 는 요청마다 달라지므로 HTML 을 빌드 시점에 미리 만들 수 없다.
 * 정적 프리렌더된 페이지의 인라인 스크립트에는 nonce 가 붙지 않고, 우리 CSP 는
 * `unsafe-inline` 을 허용하지 않으므로 브라우저가 그것을 차단한다. 그러면
 * 하이드레이션이 일어나지 않아 폼이 동작하지 않는다. (07_AUTH_SECURITY.md §6)
 */
export const dynamic = 'force-dynamic'

export default function VerifyPage(): ReactNode {
  return (
    <main className="auth-shell">
      <h1 className="sr-only">이메일 인증</h1>
      {/* useSearchParams 를 쓰는 컴포넌트는 Suspense 경계가 필요하다. */}
      <Suspense
        fallback={
          <div className="auth-card">
            <p>인증 확인 중…</p>
          </div>
        }
      >
        <VerifyStatus />
      </Suspense>
    </main>
  )
}
