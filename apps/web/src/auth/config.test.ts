import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  // PrismaClient 는 생성 시점에 datasource URL 을 검증한다. 연결은 하지 않는다.
  process.env.DATABASE_URL ??= 'postgresql://user:pass@127.0.0.1:5432/unused'
})

const { createAuthConfig } = await import('./config')
const { SESSION_MAX_AGE_SEC, SESSION_UPDATE_AGE_SEC } = await import(
  './session'
)

const originalGoogleId = process.env.AUTH_GOOGLE_ID
const originalGoogleSecret = process.env.AUTH_GOOGLE_SECRET
const originalSecret = process.env.AUTH_SECRET

function providerIds(config: ReturnType<typeof createAuthConfig>): string[] {
  return config.providers.map((provider) =>
    typeof provider === 'function' ? 'function' : provider.id,
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
  ] as const) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key)
    } else {
      process.env[key] = value
    }
  }
})

describe('createAuthConfig', () => {
  it('DB 세션 전략을 쓴다 (JWT 아님)', () => {
    const config = createAuthConfig()

    expect(config.session?.strategy).toBe('database')
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

  it('AUTH_SECRET 이 있으면 넘긴다', () => {
    process.env.AUTH_SECRET = 'a'.repeat(32)

    expect(createAuthConfig().secret).toBe('a'.repeat(32))
  })

  it('AUTH_SECRET 이 없으면 키를 넣지 않는다', () => {
    delete process.env.AUTH_SECRET

    expect(createAuthConfig()).not.toHaveProperty('secret')
  })
})
