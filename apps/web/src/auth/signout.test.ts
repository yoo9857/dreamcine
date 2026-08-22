import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  revokeSessionFromRequest: vi.fn<(request: Request) => Promise<void>>(),
}))

vi.mock('./session', () => ({
  revokeSessionFromRequest: mocks.revokeSessionFromRequest,
}))

const { withSessionRevocation } = await import('./signout')

const SIGNOUT_URL = 'http://127.0.0.1:3000/api/auth/signout'

function responseWith(...setCookie: readonly string[]): Response {
  const headers = new Headers()
  for (const cookie of setCookie) {
    headers.append('set-cookie', cookie)
  }
  return new Response(null, { status: 302, headers })
}

function wrap(response: Response): (request: Request) => Promise<Response> {
  return withSessionRevocation(() => Promise.resolve(response))
}

beforeEach(() => {
  mocks.revokeSessionFromRequest.mockReset()
  mocks.revokeSessionFromRequest.mockResolvedValue(undefined)
})

describe('withSessionRevocation', () => {
  it('로그아웃이 성립하면 DB 세션 행을 지운다', async () => {
    const request = new Request(SIGNOUT_URL, { method: 'POST' })
    await wrap(responseWith('authjs.session-token=; Path=/; Max-Age=0'))(
      request,
    )

    expect(mocks.revokeSessionFromRequest).toHaveBeenCalledWith(request)
  })

  it('__Secure- 접두사 쿠키도 알아본다', async () => {
    await wrap(
      responseWith('__Secure-authjs.session-token=; Path=/; Max-Age=0'),
    )(new Request(SIGNOUT_URL, { method: 'POST' }))

    expect(mocks.revokeSessionFromRequest).toHaveBeenCalledOnce()
  })

  it('쪼개진 쿠키(name.0)도 알아본다', async () => {
    await wrap(responseWith('authjs.session-token.0=; Path=/; Max-Age=0'))(
      new Request(SIGNOUT_URL, { method: 'POST' }),
    )

    expect(mocks.revokeSessionFromRequest).toHaveBeenCalledOnce()
  })

  it('Auth.js 가 쿠키를 비우지 않았으면 지우지 않는다', async () => {
    // 내장 CSRF 검사에 걸린 요청이 여기에 해당한다. 요청만 보고 미리 지우면
    // 남이 보낸 요청으로도 강제 로그아웃이 된다.
    await wrap(responseWith('authjs.csrf-token=abc; Path=/'))(
      new Request(SIGNOUT_URL, { method: 'POST' }),
    )

    expect(mocks.revokeSessionFromRequest).not.toHaveBeenCalled()
  })

  it('세션 쿠키에 값이 실려 있으면(로그인) 지우지 않는다', async () => {
    await wrap(responseWith('authjs.session-token=fresh-token; Path=/'))(
      new Request(SIGNOUT_URL, { method: 'POST' }),
    )

    expect(mocks.revokeSessionFromRequest).not.toHaveBeenCalled()
  })

  it('로그아웃이 아닌 경로에서는 지우지 않는다', async () => {
    await wrap(responseWith('authjs.session-token=; Path=/; Max-Age=0'))(
      new Request('http://127.0.0.1:3000/api/auth/callback/credentials', {
        method: 'POST',
      }),
    )

    expect(mocks.revokeSessionFromRequest).not.toHaveBeenCalled()
  })

  it('set-cookie 가 없어도 터지지 않는다', async () => {
    await wrap(responseWith())(new Request(SIGNOUT_URL, { method: 'POST' }))

    expect(mocks.revokeSessionFromRequest).not.toHaveBeenCalled()
  })

  it('핸들러의 응답을 그대로 돌려준다', async () => {
    const response = responseWith('authjs.session-token=; Max-Age=0')

    await expect(
      wrap(response)(new Request(SIGNOUT_URL, { method: 'POST' })),
    ).resolves.toBe(response)
  })
})
