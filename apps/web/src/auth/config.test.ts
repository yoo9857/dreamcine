import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  // PrismaClient 는 생성 시점에 datasource URL 을 검증한다. 연결은 하지 않는다.
  process.env.DATABASE_URL ??= 'postgresql://user:pass@127.0.0.1:5432/unused'
})

const { createAuthConfig, safeAuthRedirect } = await import('./config')
const { SESSION_MAX_AGE_SEC, SESSION_UPDATE_AGE_SEC } = await import(
  './session'
)

const originalGoogleId = process.env.AUTH_GOOGLE_ID
const originalGoogleSecret = process.env.AUTH_GOOGLE_SECRET
const originalSecret = process.env.AUTH_SECRET
const originalAppUrl = process.env.APP_URL

function providerIds(config: ReturnType<typeof createAuthConfig>): string[] {
  return config.providers.map((provider) =>
    typeof provider === 'function' ? 'function' : provider.id,
  )
}

/**
 * `@auth/core/lib/utils/assert.js` 의 판정을 그대로 옮긴 것.
 *
 * 이 조건이 참이면 Auth.js 는 `UnsupportedStrategy` 를 돌려주고, 로그인은
 * `/login?error=Configuration` 으로 죽는다. `onlyCredentials` 가 함께 참이어야
 * 하므로 Google 을 설정한 환경에서는 통과하고 없는 환경에서만 터진다 —
 * 환경에 따라 로그인이 되거나 안 되는 버그였다. (ISS-006)
 */
function rejectedByAuthjs(
  config: ReturnType<typeof createAuthConfig>,
): boolean {
  const providers = config.providers.map((provider) =>
    typeof provider === 'function' ? provider() : provider,
  )
  const hasCredentials = providers.some(
    (provider) => provider.type === 'credentials',
  )
  const onlyCredentials = !providers.some(
    (provider) => provider.type !== 'credentials',
  )
  return (
    hasCredentials && config.session?.strategy === 'database' && onlyCredentials
  )
}

beforeEach(() => {
  delete process.env.AUTH_GOOGLE_ID
  delete process.env.AUTH_GOOGLE_SECRET
})

afterEach(() => {
  for (const [key, value] of [
    ['AUTH_GOOGLE_ID', originalGoogleId],
    ['AUTH_GOOGLE_SECRET', originalGoogleSecret],
    ['AUTH_SECRET', originalSecret],
    ['APP_URL', originalAppUrl],
  ] as const) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key)
    } else {
      process.env[key] = value
    }
  }
})

describe('createAuthConfig', () => {
  /**
   * 앞선 테스트는 스펙의 **문구**(`strategy: 'database'`)를 그대로 단정했고,
   * 그래서 로그인이 완전히 죽은 상태로 계속 통과했다. 단정해야 할 것은
   * 문구가 아니라 **Auth.js 가 이 설정을 받아들이는가** 이다. (ISS-006)
   */
  it('Google 이 없는 환경에서도 Auth.js 가 설정을 거부하지 않는다', () => {
    expect(rejectedByAuthjs(createAuthConfig())).toBe(false)
  })

  it('Google 이 있는 환경에서도 설정을 거부하지 않는다', () => {
    process.env.AUTH_GOOGLE_ID = 'google-client-id'
    process.env.AUTH_GOOGLE_SECRET = 'google-client-secret'

    expect(rejectedByAuthjs(createAuthConfig())).toBe(false)
  })

  /**
   * 쿠키를 만드는 방식은 `'jwt'` 라고 말하지만, 그 값은 JWT 가 아니라
   * `jwt.encode` 가 만든 **DB Session 행의 토큰**이다. 즉시 정지·강제
   * 로그아웃은 그 행을 지우는 것으로 성립한다. (07_AUTH_SECURITY §1)
   */
  it('쿠키 발급은 브리지가 맡는다 (encode 가 세션 토큰을 만든다)', () => {
    const config = createAuthConfig()

    expect(config.session?.strategy).toBe('jwt')
    expect(typeof config.jwt?.encode).toBe('function')
  })

  it('30일 rolling 세션을 설정한다', () => {
    const config = createAuthConfig()

    expect(config.session?.maxAge).toBe(SESSION_MAX_AGE_SEC)
    expect(config.session?.maxAge).toBe(30 * 24 * 60 * 60)
    expect(config.session?.updateAge).toBe(SESSION_UPDATE_AGE_SEC)
  })

  it('adapter 를 연결한다', () => {
    const config = createAuthConfig()

    expect(typeof config.adapter?.getSessionAndUser).toBe('function')
    expect(typeof config.adapter?.createSession).toBe('function')
  })

  it('Credentials 공급자를 항상 포함한다', () => {
    expect(providerIds(createAuthConfig())).toContain('credentials')
  })

  it('Google 자격증명이 없으면 Google 공급자를 넣지 않는다', () => {
    expect(providerIds(createAuthConfig())).toEqual(['credentials'])
  })

  it('Google 자격증명이 있으면 Google 공급자를 추가한다', () => {
    process.env.AUTH_GOOGLE_ID = 'google-client-id'
    process.env.AUTH_GOOGLE_SECRET = 'google-client-secret'

    expect(providerIds(createAuthConfig())).toEqual(['credentials', 'google'])
  })

  it('Google 자격증명이 빈 문자열이면 추가하지 않는다', () => {
    process.env.AUTH_GOOGLE_ID = ''
    process.env.AUTH_GOOGLE_SECRET = ''

    expect(providerIds(createAuthConfig())).toEqual(['credentials'])
  })

  it('JWT 로 세션을 해석하지 않는다 (decode 는 항상 null)', async () => {
    const config = createAuthConfig()

    await expect(
      config.jwt?.decode?.({
        token: 'anything',
        secret: 'secret',
        salt: 'salt',
      }),
    ).resolves.toBeNull()
  })

  it('subject 가 없는 encode 는 E_AUTH_INVALID_CREDENTIALS', async () => {
    const config = createAuthConfig()

    await expect(
      config.jwt?.encode?.({ token: {}, secret: 'secret', salt: 'salt' }),
    ).rejects.toMatchObject({ code: 'E_AUTH_INVALID_CREDENTIALS' })
  })

  it('로그인 화면 경로를 지정한다', () => {
    const config = createAuthConfig()

    expect(config.pages?.signIn).toBe('/login')
  })

  it('운영 공개 URL을 인증 리다이렉트 기준으로 사용한다', () => {
    process.env.APP_URL = 'https://ilog.info'

    expect(safeAuthRedirect({ url: '/', baseUrl: 'http://0.0.0.0:3000' })).toBe(
      'https://ilog.info/',
    )
    expect(
      safeAuthRedirect({
        url: '/browse?from=login',
        baseUrl: 'http://0.0.0.0:3000',
      }),
    ).toBe('https://ilog.info/browse?from=login')
  })

  it('외부 인증 리다이렉트를 공개 홈으로 제한한다', () => {
    process.env.APP_URL = 'https://ilog.info'

    expect(
      safeAuthRedirect({
        url: 'https://evil.example/steal',
        baseUrl: 'http://0.0.0.0:3000',
      }),
    ).toBe('https://ilog.info')
  })

  it('AUTH_SECRET 이 있으면 넘긴다', () => {
    process.env.AUTH_SECRET = 'a'.repeat(32)

    expect(createAuthConfig().secret).toBe('a'.repeat(32))
  })

  it('AUTH_SECRET 이 없으면 키를 넣지 않는다', () => {
    delete process.env.AUTH_SECRET

    expect(createAuthConfig()).not.toHaveProperty('secret')
  })
})
