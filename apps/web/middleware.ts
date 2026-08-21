import { NotImplementedError } from '@aidream/core'
import type { NextRequest } from 'next/server'

/**
 * 1층 방어. 미인증 사용자를 로그인으로 보내고 CSP nonce·보안 헤더를 붙인다.
 * **보안의 근거로 삼지 않는다** — 실제 경계는 `withRoute` + `can()` 이다.
 * (07_AUTH_SECURITY.md §3)
 */
export function middleware(_req: NextRequest): Response {
  throw new NotImplementedError('T03:middleware')
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
