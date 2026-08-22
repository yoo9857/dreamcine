import { revokeSessionFromRequest } from './session'
import { SESSION_COOKIE_NAMES } from './types'

/** Auth.js 의 라우트 핸들러와 같은 모양. */
type Handler<R extends Request> = (request: R) => Promise<Response>

function isSignOut(request: Request): boolean {
  return new URL(request.url).pathname.endsWith('/auth/signout')
}

/**
 * Auth.js 가 세션 쿠키를 **비우는** 응답을 보냈는가. 로그아웃이 실제로
 * 성립했다는 신호로 이것을 쓴다. 요청만 보고 미리 지우면 Auth.js 의 내장
 * CSRF 검사를 통과하지 못한 요청으로도 강제 로그아웃이 가능해진다.
 */
function clearedSessionCookie(response: Response): boolean {
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0] ?? ''
    const separator = pair.indexOf('=')
    if (separator === -1) {
      continue
    }
    const name = pair.slice(0, separator).trim()
    if (pair.slice(separator + 1).trim() !== '') {
      continue
    }
    // 큰 쿠키는 `name.0`, `name.1` 로 쪼개진다.
    const matches = SESSION_COOKIE_NAMES.some(
      (base) => name === base || name.startsWith(`${base}.`),
    )
    if (matches) {
      return true
    }
  }
  return false
}

/**
 * 로그아웃이 **서버의 세션을 실제로 취소하게** 만든다.
 *
 * 우리 세션 쿠키는 JWT 가 아니라 DB Session 행을 가리킨다 (config.ts 의 브리지).
 * 그런데 Auth.js 의 signOut 은 `strategy: 'jwt'` 경로에서 `jwt.decode` 만 부르고
 * `adapter.deleteSession` 은 호출하지 않는다
 * (`@auth/core/lib/actions/signout.js`). 그대로 두면 쿠키만 지워지고 세션 행은
 * 만료(30일)까지 살아있다 — 로그아웃이 취소를 하지 못한다. 쿠키 값이 어딘가로
 * 새어나간 뒤라면 로그아웃했다는 믿음이 그대로 배신당한다. (ISS-007)
 *
 * 그래서 Auth.js 에 위임한 **뒤에**, 그 응답이 세션 쿠키를 비웠을 때만 행을
 * 지운다. 07_AUTH_SECURITY.md §1 이 요구하는 즉시 취소가 여기서 성립한다.
 */
export function withSessionRevocation<R extends Request>(
  handler: Handler<R>,
): Handler<R> {
  return async (request: R): Promise<Response> => {
    const response = await handler(request)
    if (isSignOut(request) && clearedSessionCookie(response)) {
      await revokeSessionFromRequest(request)
    }
    return response
  }
}
