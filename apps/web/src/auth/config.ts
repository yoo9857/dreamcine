import { randomUUID } from 'node:crypto'

import { AppError, LoginSchema } from '@aidream/core'
import { createAuthSession, findUserByEmail } from '@aidream/db'
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

import { createAuthAdapter } from './adapter'
import { verifyPassword } from './password'
import { SESSION_MAX_AGE_SEC, SESSION_UPDATE_AGE_SEC } from './session'

function credentialsProvider(): NextAuthConfig['providers'][number] {
  return Credentials({
    id: 'credentials',
    name: '이메일',
    credentials: {
      email: { label: '이메일', type: 'email' },
      password: { label: '비밀번호', type: 'password' },
    },
    /**
     * 실패 사유를 구분해서 돌려주지 않는다. 없는 이메일·틀린 비밀번호·정지
     * 계정이 모두 같은 결과여야 계정 존재 여부가 새지 않는다.
     * (07_AUTH_SECURITY.md §11)
     *
     * `verifyPassword` 는 해시가 없어도 더미 해시로 검증을 수행하므로
     * 응답 시간도 비슷하게 유지된다.
     */
    authorize: async (raw) => {
      const parsed = LoginSchema.safeParse(raw)
      if (!parsed.success) {
        return null
      }
      const { email, password } = parsed.data
      const user = await findUserByEmail(email)
      const valid = await verifyPassword(user?.passwordHash ?? null, password)
      if (user === null || !valid || user.status !== 'ACTIVE') {
        return null
      }
      return { id: user.id, email: user.email, name: user.displayName }
    },
  })
}

function googleProvider(): NextAuthConfig['providers'][number] | null {
  const clientId = process.env.AUTH_GOOGLE_ID
  const clientSecret = process.env.AUTH_GOOGLE_SECRET
  if (
    clientId === undefined ||
    clientId === '' ||
    clientSecret === undefined ||
    clientSecret === ''
  ) {
    return null
  }
  return Google({ clientId, clientSecret })
}

/**
 * Auth.js v5 는 Credentials 공급자를 JWT 세션에서만 지원한다. 그러나 이 서비스는
 * **DB 세션이 필수**다 — 신고→차단이 즉시 효력을 가져야 하기 때문이다.
 * (07_AUTH_SECURITY.md §1)
 *
 * 두 요구를 동시에 만족시키는 지점이 여기다. Credentials 로그인이 끝나면
 * Auth.js 가 `jwt.encode` 를 호출하는데, 그 안에서 **실제 Session 행을 만들고
 * 그 sessionToken 을 쿠키 값으로 돌려준다.** `decode` 는 항상 null 을 돌려
 * 어떤 요청도 JWT 로 해석되지 않게 막는다.
 *
 * 결과적으로 Credentials 와 Google 이 **같은 DB 세션 테이블**을 쓴다.
 * 세션 읽기는 Auth.js 가 아니라 `session.ts` 의 단일 지점이 담당한다.
 */
function databaseSessionBridge(): NonNullable<NextAuthConfig['jwt']> {
  return {
    encode: async ({ token }) => {
      const userId = token?.sub
      if (typeof userId !== 'string' || userId === '') {
        throw new AppError('E_AUTH_INVALID_CREDENTIALS', {
          reason: 'missing-subject',
        })
      }
      const sessionToken = randomUUID()
      await createAuthSession({
        sessionToken,
        userId,
        expires: new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000),
      })
      return sessionToken
    },
    decode: () => Promise.resolve(null),
  }
}

export function createAuthConfig(): NextAuthConfig {
  const google = googleProvider()
  const providers: NextAuthConfig['providers'] = [credentialsProvider()]
  if (google !== null) {
    providers.push(google)
  }

  return {
    adapter: createAuthAdapter(),
    providers,
    // 쿠키 기본값이 이미 httpOnly + secure(prod) + sameSite=lax 이며
    // 이름은 `authjs.session-token` / `__Secure-authjs.session-token` 이다.
    // `session.ts` 의 SESSION_COOKIE_NAMES 와 짝을 이룬다.
    /**
     * `strategy` 는 **Auth.js 에게 쿠키를 어떻게 만들지** 알려주는 값이다.
     * 우리가 원하는 결과(DB 세션)는 위 브리지가 만든다.
     *
     * 여기에 `'database'` 를 쓰면 Auth.js 가 설정 자체를 거부한다 —
     * `@auth/core/lib/utils/assert.js` 는 Credentials 공급자가 있고
     * `session.strategy === 'database'` 이면 `UnsupportedStrategy` 를 돌려주고,
     * 그것이 `/login?error=Configuration` 으로 나타난다. 로그인이 전면 불능이 된다.
     *
     * 그 판정 조건에 함정이 하나 더 있다 — `onlyCredentials` 도 함께 참이어야
     * 한다. 즉 Google 을 설정한 환경에서는 통과하고, `AUTH_GOOGLE_ID` 가 없는
     * 환경에서만 터진다. 환경에 따라 로그인이 되거나 안 되는 버그였다. (ISS-006)
     *
     * 그래서 Auth.js 에는 `'jwt'` 라고 말하고, `jwt.encode` 에서 실제 Session
     * 행을 만들어 그 토큰을 쿠키 값으로 돌려준다. 쿠키가 가리키는 것은 JWT 가
     * 아니라 DB 행이므로, 07_AUTH_SECURITY.md §1 이 요구하는 즉시 정지·강제
     * 로그아웃·기기 관리가 그대로 성립한다.
     */
    session: {
      strategy: 'jwt',
      maxAge: SESSION_MAX_AGE_SEC,
      updateAge: SESSION_UPDATE_AGE_SEC,
    },
    jwt: databaseSessionBridge(),
    pages: { signIn: '/login', error: '/login' },
    trustHost: true,
    ...(process.env.AUTH_SECRET === undefined
      ? {}
      : { secret: process.env.AUTH_SECRET }),
  }
}
