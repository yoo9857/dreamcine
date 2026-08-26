import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ checkRateLimit: vi.fn() }))

vi.mock('../http/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))

const { withCredentialLoginRateLimit } = await import('./guard')

const handler = vi.fn(() => Promise.resolve(new Response('ok')))

beforeEach(() => {
  handler.mockClear()
  mocks.checkRateLimit.mockReset()
  mocks.checkRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 9,
    retryAfterSec: 0,
  })
  process.env.APP_URL = 'https://ilog.info'
})

describe('withCredentialLoginRateLimit', () => {
  it('Credentials 로그인은 신뢰 프록시 IP로 제한한다', async () => {
    const request = new Request(
      'http://0.0.0.0:3000/api/auth/callback/credentials',
      { method: 'POST', headers: { 'x-real-ip': '203.0.113.7' } },
    )

    await withCredentialLoginRateLimit(handler)(request)

    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      { bucket: 'auth-login', limit: 10, windowSec: 600 },
      '203.0.113.7',
    )
    expect(handler).toHaveBeenCalledWith(request)
  })

  it('한도 초과는 canonical 로그인 URL과 Retry-After로 거절한다', async () => {
    mocks.checkRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSec: 417,
    })

    const response = await withCredentialLoginRateLimit(handler)(
      new Request('http://0.0.0.0:3000/api/auth/callback/credentials', {
        method: 'POST',
      }),
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('417')
    expect(await response.json()).toEqual({
      url: 'https://ilog.info/login?error=CredentialsSignin&code=credentials',
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('로그아웃과 OAuth 요청은 제한 대상이 아니다', async () => {
    const request = new Request('https://ilog.info/api/auth/signout', {
      method: 'POST',
    })

    await withCredentialLoginRateLimit(handler)(request)

    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledWith(request)
  })
})
