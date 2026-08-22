import NextAuth from 'next-auth'

import { createAuthConfig } from '@/src/auth/config'
import { withSessionRevocation } from '@/src/auth/signout'

/**
 * Auth.js 위임. 이 엔드포인트는 라이브러리 내장 CSRF 토큰을 사용하므로
 * `withRoute` 를 경유하지 않는다. (07_AUTH_SECURITY.md §7)
 *
 * POST 만 한 겹 감싼다 — 로그아웃이 DB 세션 행을 실제로 지우게 하기 위해서다.
 * 이유는 `withSessionRevocation` 에 적어 두었다. (ISS-007)
 */
const { handlers } = NextAuth(createAuthConfig())

export const { GET } = handlers
export const POST = withSessionRevocation(handlers.POST)
