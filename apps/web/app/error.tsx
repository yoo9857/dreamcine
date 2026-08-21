'use client'

import type { ReactNode } from 'react'

/** 전역 오류 경계. 08_UIUX_SPEC.md §3 — 오류 상태는 항상 재시도 수단을 가진다. */
export default function GlobalError({
  reset,
}: {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}): ReactNode {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>문제가 발생했습니다</h1>
        <p className="error">화면을 표시하지 못했습니다.</p>
        <button type="button" onClick={reset}>
          다시 시도
        </button>
      </div>
    </div>
  )
}
