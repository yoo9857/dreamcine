import type { UserRole, UserStatus } from '@aidream/core'

/**
 * Auth.js v5 의 기본 세션 쿠키 이름. secure 접두 버전을 먼저 본다.
 *
 * `middleware.ts`(Edge 런타임)와 `session.ts`(Node 런타임)가 함께 쓰므로
 * DB 를 끌어오지 않는 이 파일에 둔다. Edge 에서 Prisma 를 import 하면 깨진다.
 */
export const SESSION_COOKIE_NAMES = [
  '__Secure-authjs.session-token',
  'authjs.session-token',
] as const

/** 라우트가 공유하는 세션 사용자 계약. 비밀번호 해시는 절대 포함하지 않는다. */
export interface SessionUser {
  readonly id: string
  readonly handle: string
  readonly email: string
  readonly displayName: string
  readonly role: UserRole
  readonly status: UserStatus
  readonly emailVerified: boolean
}

export interface RouteSession {
  readonly userId: string
  readonly user: SessionUser
  readonly expiresAt: Date
}
