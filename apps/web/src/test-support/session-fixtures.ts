import type { RouteSession, SessionUser } from '@/src/auth/types'

/**
 * 세션 픽스처.
 *
 * `SessionUser` 는 라우트·서비스 테스트 수십 곳에서 인라인 리터럴로 만들어졌다.
 * 그래서 세션 계약에 필드가 하나 늘 때마다 무관한 테스트가 한꺼번에 깨졌다
 * (T16 에서 `tier` 를 넣을 때 20여 곳). 여기 하나만 고치면 된다.
 */
const EPOCH = new Date('2026-09-01T00:00:00.000Z')

export function sessionUserFixture(
  overrides: Partial<SessionUser> = {},
): SessionUser {
  return {
    id: 'user_fixture',
    handle: 'fixture',
    email: 'fixture@example.com',
    displayName: 'Fixture',
    role: 'VIEWER',
    status: 'ACTIVE',
    emailVerified: true,
    tier: 'BRONZE',
    isVerified: false,
    ...overrides,
  }
}

export function routeSessionFixture(
  overrides: Partial<SessionUser> = {},
  session: Partial<Omit<RouteSession, 'user'>> = {},
): RouteSession {
  const user = sessionUserFixture(overrides)
  return {
    userId: user.id,
    user,
    expiresAt: EPOCH,
    ...session,
  }
}
