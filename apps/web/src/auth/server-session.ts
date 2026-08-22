import { type Actor, can, type Action } from '@aidream/core'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getSessionByToken, sessionTokenFromCookies } from './session'
import type { RouteSession } from './types'

/**
 * 서버 컴포넌트에서 세션을 읽는다.
 *
 * 라우트는 `withRoute` 가 세션을 주지만 서버 컴포넌트에는 `Request` 가 없다.
 * 그렇다고 판정을 새로 쓰면 만료·롤링·정지 처리가 두 벌이 되고, 한쪽만
 * 고쳐지는 날이 온다. 그래서 토큰만 여기서 꺼내고 판정은 `session.ts` 의
 * 같은 함수에 맡긴다.
 */
export async function getServerSession(): Promise<RouteSession | null> {
  const store = await cookies()
  const token = sessionTokenFromCookies(
    (name) => store.get(name)?.value ?? undefined,
  )
  return getSessionByToken(token)
}

function actorOf(session: RouteSession): Actor {
  return {
    id: session.userId,
    role: session.user.role,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
  }
}

/**
 * 화면 진입을 권한으로 막는다.
 *
 * **미들웨어를 신뢰하지 않는다.** 미들웨어는 쿠키가 있는지만 보고 리다이렉트할
 * 뿐이며 08_UIUX_SPEC.md §1 이 그것을 "UX 용 기준이며 보안 경계가 아니다" 라고
 * 못박고 있다. 역할·정지·이메일 인증 판정은 세션을 실제로 읽는 여기서 한다.
 *
 * 판정 자체는 `can()` 이 소유한다 — 화면이 역할 문자열을 직접 비교하기
 * 시작하면 권한 규칙이 코드 전체로 흩어진다. (07_AUTH_SECURITY.md §3)
 */
export async function requireCapability(
  action: Action,
  currentPath: string,
): Promise<RouteSession> {
  const session = await getServerSession()
  if (session === null) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`)
  }
  if (!can(actorOf(session), action)) {
    /*
      권한이 없는 사용자를 로그인으로 보내면 "로그인했는데 또 로그인하라네" 가
      된다. 없는 화면으로 취급하는 편이 정직하고, 어떤 경로가 존재하는지도
      덜 새어나간다.
    */
    redirect('/')
  }
  return session
}
