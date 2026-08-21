import type { UserRole, UserStatus } from '@aidream/core'

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
