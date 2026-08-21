import NextAuth from 'next-auth'

import { createAuthConfig } from '@/src/auth/config'

/**
 * Auth.js 위임. 이 엔드포인트는 라이브러리 내장 CSRF 토큰을 사용하므로
 * `withRoute` 를 경유하지 않는다. (07_AUTH_SECURITY.md §7)
 */
const { handlers } = NextAuth(createAuthConfig())

export const { GET, POST } = handlers
