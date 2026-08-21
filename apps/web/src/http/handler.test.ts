import { AppError, NotImplementedError } from '@aidream/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import type { RouteSession } from '../auth/types'

interface LogRecord {
  level: string
  fields: Record<string, unknown>
  message: string
}

const mocks = vi.hoisted(() => {
  process.env.APP_URL = 'https://app.test'
  process.env.CAPACITY_TIER = 'T0'
  return {
    getSessionFromRequest: vi.fn(),
    hasSessionCookie: vi.fn(),
    revokeSessionFromRequest: vi.fn(),
    checkRateLimit: vi.fn(),
    logs: [] as LogRecord[],
  }
})

vi.mock('../auth/session', () => ({
  getSessionFromRequest: mocks.getSessionFromRequest,
  hasSessionCookie: mocks.hasSessionCookie,
  revokeSessionFromRequest: mocks.revokeSessionFromRequest,
}))

vi.mock('./rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit }))

vi.mock('../lib/logger', () => {
  const record =
    (level: string) =>
    (fields: Record<string, unknown>, message: string): void => {
      mocks.logs.push({ level, fields, message })
    }
  return {
    getLogger: () => ({
      trace: record('trace'),
      debug: record('debug'),
      info: record('info'),
      warn: record('warn'),
      error: record('error'),
    }),
  }
})

const { withRoute } = await import('./handler')

const ORIGIN = 'https://app.test'

function makeSession(
  overrides: Partial<RouteSession['user']> = {},
): RouteSession {
  return {
    userId: 'user_1',
    user: {
      id: 'user_1',
      handle: 'creator_01',
      email: 'creator@example.com',
      displayName: '제작자',
      role: 'CREATOR',
      status: 'ACTIVE',
      emailVerified: true,
      ...overrides,
    },
    expiresAt: new Date(Date.now() + 60_000),
  }
}

interface RequestInitLike {
  method?: string
  body?: string
  origin?: string | null
  path?: string
  headers?: Record<string, string>
}

function request(init: RequestInitLike = {}): Request {
  const method = init.method ?? 'GET'
  const headers = new Headers(init.headers)
  if (init.origin !== null) {
    headers.set('origin', init.origin ?? ORIGIN)
  }
  if (init.body !== undefined) {
    headers.set('content-type', 'application/json')
  }
  return new Request(`${ORIGIN}${init.path ?? '/api/test'}`, {
    method,
    headers,
    ...(init.body === undefined ? {} : { body: init.body }),
  })
}

const emptyParams = { params: Promise.resolve<Record<string, string>>({}) }

interface ErrorBody {
  error: {
    code: string
    message: string
    fields: Record<string, string> | null
    requestId: string
  }
}

async function errorBody(response: Response): Promise<ErrorBody> {
  return (await response.json()) as ErrorBody
}

beforeEach(() => {
  mocks.logs.length = 0
  mocks.getSessionFromRequest.mockReset()
  mocks.hasSessionCookie.mockReset()
  mocks.revokeSessionFromRequest.mockReset()
  mocks.checkRateLimit.mockReset()
  mocks.getSessionFromRequest.mockResolvedValue(null)
  mocks.hasSessionCookie.mockReturnValue(false)
  mocks.revokeSessionFromRequest.mockResolvedValue(undefined)
  mocks.checkRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 9,
    retryAfterSec: 0,
  })
})

describe('withRoute — 인증', () => {
  it("auth:'required' 인데 세션이 없으면 401 E_AUTH_REQUIRED", async () => {
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'required',
    })
    const response = await route(request(), emptyParams)

    expect(response.status).toBe(401)
    expect((await errorBody(response)).error.code).toBe('E_AUTH_REQUIRED')
  })

  it('쿠키는 있는데 세션이 없으면 401 E_AUTH_SESSION_EXPIRED 이고 쿠키를 지운다', async () => {
    mocks.hasSessionCookie.mockReturnValue(true)
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'required',
    })
    const response = await route(request(), emptyParams)

    expect(response.status).toBe(401)
    expect((await errorBody(response)).error.code).toBe(
      'E_AUTH_SESSION_EXPIRED',
    )
    const cookies = response.headers.getSetCookie()
    expect(cookies).toHaveLength(2)
    expect(cookies.every((cookie) => cookie.includes('Max-Age=0'))).toBe(true)
  })

  it("auth:'required' 이고 세션이 있으면 ctx.session 이 non-null 이다", async () => {
    mocks.getSessionFromRequest.mockResolvedValue(makeSession())
    const route = withRoute(
      ({ session }) => Promise.resolve({ status: 200, body: session.userId }),
      { auth: 'required' },
    )
    const response = await route(request(), emptyParams)

    expect(response.status).toBe(200)
    expect(await response.json()).toBe('user_1')
  })

  it("auth:'none' 이면 세션을 조회하지 않는다", async () => {
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'none',
    })
    await route(request(), emptyParams)

    expect(mocks.getSessionFromRequest).not.toHaveBeenCalled()
  })

  it("auth:'optional' 이면 세션이 없어도 통과한다", async () => {
    const route = withRoute(
      ({ session }) => Promise.resolve({ status: 200, body: session === null }),
      { auth: 'optional' },
    )
    const response = await route(request(), emptyParams)

    expect(await response.json()).toBe(true)
  })

  it('정지 계정은 403 이고 세션을 즉시 무효화한다', async () => {
    mocks.getSessionFromRequest.mockResolvedValue(
      makeSession({ status: 'SUSPENDED' }),
    )
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'required',
    })
    const response = await route(request(), emptyParams)

    expect(response.status).toBe(403)
    expect((await errorBody(response)).error.code).toBe(
      'E_AUTH_ACCOUNT_SUSPENDED',
    )
    expect(mocks.revokeSessionFromRequest).toHaveBeenCalledTimes(1)
  })
})

describe('withRoute — CSRF', () => {
  it('Origin 불일치 POST 는 403 E_PERM_DENIED', async () => {
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'none',
    })
    const response = await route(
      request({ method: 'POST', origin: 'https://evil.test', body: '{}' }),
      emptyParams,
    )

    expect(response.status).toBe(403)
    expect((await errorBody(response)).error.code).toBe('E_PERM_DENIED')
  })

  it('Origin 이 없는 POST 도 거부한다', async () => {
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'none',
    })
    const response = await route(
      request({ method: 'POST', origin: null, body: '{}' }),
      emptyParams,
    )

    expect(response.status).toBe(403)
  })

  it('Origin 이 일치하면 통과한다', async () => {
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'none',
    })
    const response = await route(
      request({ method: 'POST', body: '{}' }),
      emptyParams,
    )

    expect(response.status).toBe(200)
  })

  it('GET 은 Origin 이 없어도 통과한다', async () => {
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'none',
    })
    const response = await route(request({ origin: null }), emptyParams)

    expect(response.status).toBe(200)
  })

  it('csrf:false 는 Origin 검증을 건너뛴다', async () => {
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'none',
      csrf: false,
    })
    const response = await route(
      request({ method: 'POST', origin: 'https://evil.test', body: '{}' }),
      emptyParams,
    )

    expect(response.status).toBe(200)
  })
})

describe('withRoute — 레이트리밋', () => {
  it('한도를 넘으면 429 와 Retry-After 를 준다', async () => {
    mocks.checkRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSec: 42,
    })
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'none',
      rateLimit: { bucket: 'auth', limit: 10, windowSec: 600, by: 'ip' },
    })
    const response = await route(request(), emptyParams)

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('42')
    expect((await errorBody(response)).error.code).toBe('E_RATE_LIMITED')
  })

  it("by:'ip' 는 X-Forwarded-For 첫 값을 신원으로 쓴다", async () => {
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'none',
      rateLimit: { bucket: 'auth', limit: 10, windowSec: 600, by: 'ip' },
    })
    await route(
      request({ headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } }),
      emptyParams,
    )

    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      { bucket: 'auth', limit: 10, windowSec: 600 },
      '203.0.113.7',
    )
  })

  it("by:'user' 는 userId 를 신원으로 쓴다", async () => {
    mocks.getSessionFromRequest.mockResolvedValue(makeSession())
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'required',
      csrf: false,
      rateLimit: { bucket: 'me', limit: 300, windowSec: 60, by: 'user' },
    })
    await route(request(), emptyParams)

    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      { bucket: 'me', limit: 300, windowSec: 60 },
      'user_1',
    )
  })

  it('레이트리밋이 없으면 호출하지 않는다', async () => {
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'none',
    })
    await route(request(), emptyParams)

    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
  })
})

describe('withRoute — 오류 변환', () => {
  it('AppError 는 status-map 의 상태코드가 된다', async () => {
    const route = withRoute(
      () => Promise.reject(new AppError('E_USER_EMAIL_TAKEN')),
      { auth: 'none' },
    )
    const response = await route(request(), emptyParams)

    expect(response.status).toBe(409)
    expect((await errorBody(response)).error.code).toBe('E_USER_EMAIL_TAKEN')
  })

  it('ZodError 는 422 이고 fields 를 담는다', async () => {
    const schema = z.object({ email: z.string().email() })
    const route = withRoute(
      () =>
        Promise.resolve(schema.parse({ email: 'bad' })).then(() => ({
          status: 200,
        })),
      { auth: 'none' },
    )
    const response = await route(request(), emptyParams)

    expect(response.status).toBe(422)
    const body = await errorBody(response)
    expect(body.error.code).toBe('E_VALIDATION')
    expect(body.error.fields).toHaveProperty('email')
  })

  it('NotImplementedError 는 501 이다', async () => {
    const route = withRoute(
      () => Promise.reject(new NotImplementedError('T03:test')),
      { auth: 'none' },
    )
    const response = await route(request(), emptyParams)

    expect(response.status).toBe(501)
    expect((await errorBody(response)).error.code).toBe('E_NOT_IMPLEMENTED')
  })

  it('미분류 예외는 500 이고 응답에 스택이 없다', async () => {
    const route = withRoute(
      () => Promise.reject(new TypeError('cannot read property of undefined')),
      { auth: 'none' },
    )
    const response = await route(request(), emptyParams)

    expect(response.status).toBe(500)
    const raw = await response.text()
    expect(raw).not.toContain('cannot read property')
    expect(raw).not.toContain('stack')
    expect(Object.keys((JSON.parse(raw) as ErrorBody).error)).toEqual([
      'code',
      'message',
      'fields',
      'requestId',
    ])
  })

  it('detail 을 응답에 넣지 않는다', async () => {
    const route = withRoute(
      () =>
        Promise.reject(
          new AppError('E_PERM_DENIED', { reason: 'internal-only-detail' }),
        ),
      { auth: 'none' },
    )
    const response = await route(request(), emptyParams)

    expect(await response.text()).not.toContain('internal-only-detail')
  })

  it('본문이 JSON 이 아니면 422 다', async () => {
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'none',
    })
    const response = await route(
      request({ method: 'POST', body: 'not json' }),
      emptyParams,
    )

    expect(response.status).toBe(422)
    expect((await errorBody(response)).error.code).toBe('E_VALIDATION')
  })

  it('500 이면 스택을 error 레벨로 남긴다', async () => {
    const route = withRoute(() => Promise.reject(new TypeError('boom')), {
      auth: 'none',
    })
    await route(request(), emptyParams)

    const errors = mocks.logs.filter((entry) => entry.level === 'error')
    expect(errors).toHaveLength(1)
    expect(errors[0]?.fields.err).toBeInstanceOf(TypeError)
  })

  it('4xx 에는 error 로그를 남기지 않는다', async () => {
    const route = withRoute(
      () => Promise.reject(new AppError('E_PERM_DENIED')),
      { auth: 'none' },
    )
    await route(request(), emptyParams)

    expect(mocks.logs.filter((entry) => entry.level === 'error')).toHaveLength(
      0,
    )
  })
})

describe('withRoute — 응답', () => {
  it('모든 응답에 X-Request-Id 헤더가 있다', async () => {
    const success = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'none',
    })
    const failure = withRoute(
      () => Promise.reject(new AppError('E_INTERNAL')),
      { auth: 'none' },
    )

    for (const route of [success, failure]) {
      const response = await route(request(), emptyParams)
      expect(response.headers.get('x-request-id')).toHaveLength(26)
    }
  })

  it('응답의 requestId 와 헤더가 같다', async () => {
    const route = withRoute(() => Promise.reject(new AppError('E_INTERNAL')), {
      auth: 'none',
    })
    const response = await route(request(), emptyParams)

    expect((await errorBody(response)).error.requestId).toBe(
      response.headers.get('x-request-id'),
    )
  })

  it('BigInt 를 문자열로 직렬화한다', async () => {
    const route = withRoute(
      () =>
        Promise.resolve({
          status: 200,
          body: { viewCount: 9_007_199_254_740_993n },
        }),
      { auth: 'none' },
    )
    const response = await route(request(), emptyParams)

    expect(await response.text()).toBe('{"viewCount":"9007199254740993"}')
  })

  it('204 는 본문이 없다', async () => {
    const route = withRoute(() => Promise.resolve({ status: 204 }), {
      auth: 'none',
    })
    const response = await route(request(), emptyParams)

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
  })

  it('모든 응답이 no-store 다', async () => {
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'none',
    })
    const response = await route(request(), emptyParams)

    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('핸들러가 준 헤더를 덧붙인다', async () => {
    const route = withRoute(
      () =>
        Promise.resolve({
          status: 200,
          body: {},
          headers: { 'x-custom': 'value' },
        }),
      { auth: 'none' },
    )
    const response = await route(request(), emptyParams)

    expect(response.headers.get('x-custom')).toBe('value')
  })

  it('동적 세그먼트가 없는 라우트는 params 없이 호출된다', async () => {
    // Next 는 정적 경로에서 params 를 주지 않는다. 실제 서버에서만 드러났던
    // 형태이므로 회귀를 여기서 막는다. (/api/health 가 500 이던 원인)
    const route = withRoute(
      ({ params }) => Promise.resolve({ status: 200, body: params }),
      { auth: 'none' },
    )

    const withoutParams = await route(request(), {})
    expect(withoutParams.status).toBe(200)
    expect(await withoutParams.json()).toEqual({})

    const undefinedParams = await route(request(), { params: undefined })
    expect(undefinedParams.status).toBe(200)
    expect(await undefinedParams.json()).toEqual({})
  })

  it('catch-all 세그먼트의 배열 params 는 첫 값만 쓴다', async () => {
    const route = withRoute(
      ({ params }) => Promise.resolve({ status: 200, body: params }),
      { auth: 'none' },
    )
    const response = await route(request(), {
      params: Promise.resolve({
        slug: ['a', 'b'],
        id: 'x',
        missing: undefined,
      }),
    })

    expect(await response.json()).toEqual({ slug: 'a', id: 'x' })
  })

  it('Next 15 의 params Promise 를 풀어서 넘긴다', async () => {
    const route = withRoute(
      ({ params, query }) =>
        Promise.resolve({ status: 200, body: { params, q: query.get('q') } }),
      { auth: 'none' },
    )
    const response = await route(
      request({ path: '/api/episodes/ep_1?q=hello' }),
      { params: Promise.resolve({ id: 'ep_1' }) },
    )

    expect(await response.json()).toEqual({
      params: { id: 'ep_1' },
      q: 'hello',
    })
  })
})

describe('withRoute — 로그', () => {
  it('요청당 한 줄을 남긴다', async () => {
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'none',
    })
    await route(request({ path: '/api/health' }), emptyParams)

    const info = mocks.logs.filter((entry) => entry.message === 'request')
    expect(info).toHaveLength(1)
    expect(info[0]?.fields).toMatchObject({
      method: 'GET',
      path: '/api/health',
      status: 200,
    })
    expect(typeof info[0]?.fields.durationMs).toBe('number')
  })

  it('세션이 있으면 userId 를 로그에 남긴다', async () => {
    mocks.getSessionFromRequest.mockResolvedValue(makeSession())
    const route = withRoute(() => Promise.resolve({ status: 200 }), {
      auth: 'required',
      csrf: false,
    })
    await route(request(), emptyParams)

    const info = mocks.logs.find((entry) => entry.message === 'request')
    expect(info?.fields.userId).toBe('user_1')
  })

  it('실패한 요청은 errorCode 를 함께 남긴다', async () => {
    const route = withRoute(
      () => Promise.reject(new AppError('E_PERM_DENIED')),
      { auth: 'none' },
    )
    await route(request(), emptyParams)

    const info = mocks.logs.find((entry) => entry.message === 'request')
    expect(info?.fields).toMatchObject({
      status: 403,
      errorCode: 'E_PERM_DENIED',
    })
  })
})
