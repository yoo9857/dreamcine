import { actorFromAccount, type Actor } from '@aidream/core'

import type { RouteSession } from './types'

/**
 * 세션 → 판정 주체. **웹 계층에서 `can()` 을 부를 때 반드시 이 함수를 거친다.**
 *
 * `SessionUser` 는 `ActorAccount` 와 필드가 같지만 그대로 넘기지 않고 통로를
 * 하나 둔다. 이유:
 * - `session === null` 해석이 라우트마다 흩어지는 것을 막는다. 그것이 원래
 *   GUEST 판정이 `can()` 밖으로 새어나간 경로였다. (ISS-020)
 * - 세션 계약이 넓어져도(예: 토큰 스코프 추가) 판정 입력은 여기서만 바뀐다.
 */
export function actorFromSession(session: RouteSession | null): Actor {
  return actorFromAccount(
    session === null
      ? null
      : {
          id: session.user.id,
          role: session.user.role,
          status: session.user.status,
          emailVerified: session.user.emailVerified,
        },
  )
}
