import Link from 'next/link'
import type { ReactNode } from 'react'

export default function NotFound(): ReactNode {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>페이지를 찾을 수 없습니다</h1>
        <p className="hint">요청한 주소가 존재하지 않거나 삭제되었습니다.</p>
        <p className="hint">
          <Link href="/">홈으로 이동</Link>
        </p>
      </div>
    </div>
  )
}
