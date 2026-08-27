import type { MemberTier, UserRole, UserStatus } from '@aidream/core'

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
  /**
   * 우상단 프로필에 등급 배지를 그리려면 세션에 등급이 있어야 한다. 매 렌더에
   * DB 를 다시 조회하지 않기 위한 것이며, 권한 판정에는 쓰이지 않는다 —
   * 등급은 혜택 축이다. (ISS-020)
   */
  readonly tier: MemberTier
  readonly isVerified: boolean
}

export interface RouteSession {
  readonly userId: string
  readonly user: SessionUser
  readonly expiresAt: Date
}
