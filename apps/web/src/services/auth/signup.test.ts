import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  // PrismaClient 는 생성 시점에 datasource URL 을 검증한다. 연결은 하지 않는다.
  process.env.DATABASE_URL ??= 'postgresql://user:pass@127.0.0.1:5432/unused'
})

/**
 * 이 import 는 `@/src/auth/password`, `@/src/lib/logger`, `@/src/lib/mail` 로
 * 이어지는 경로 별칭 그래프 전체를 실제로 해석한다. 별칭이 깨지면 여기서 죽는다.
 * (tsconfig 의 paths 와 vitest 의 resolve.alias 가 어긋나는 사고를 막는 지점)
 */
const { EMAIL_VERIFY_TTL_MS, VERIFY_TOKEN_PREFIX, createOneTimeToken, signup } =
  await import('./signup')

describe('signup module', () => {
  it('경로 별칭을 거친 import 그래프가 해석된다', () => {
    expect(typeof signup).toBe('function')
  })

  it('인증 토큰 수명은 24시간이다', () => {
    expect(EMAIL_VERIFY_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })

  it('인증 토큰의 identifier 접두는 재설정과 겹치지 않는다', async () => {
    const { RESET_TOKEN_PREFIX } = await import('./request-password-reset')

    expect(VERIFY_TOKEN_PREFIX).toBe('verify:')
    expect(RESET_TOKEN_PREFIX).not.toBe(VERIFY_TOKEN_PREFIX)
    expect(VERIFY_TOKEN_PREFIX.startsWith(RESET_TOKEN_PREFIX)).toBe(false)
    expect(RESET_TOKEN_PREFIX.startsWith(VERIFY_TOKEN_PREFIX)).toBe(false)
  })
})

describe('createOneTimeToken', () => {
  it('URL 에 그대로 실을 수 있는 문자만 쓴다', () => {
    // 메일 링크의 쿼리스트링에 들어가므로 base64url 이어야 한다.
    expect(createOneTimeToken()).toMatch(/^[A-Za-z0-9_-]+$/u)
  })

  it('256비트 엔트로피를 담는다', () => {
    // base64url 로 32바이트는 43자다.
    expect(createOneTimeToken()).toHaveLength(43)
  })

  it('매번 다른 값이 나온다', () => {
    const tokens = new Set(
      Array.from({ length: 500 }, () => createOneTimeToken()),
    )

    expect(tokens.size).toBe(500)
  })

  it('스키마의 토큰 길이 상한 안에 들어간다', async () => {
    const { VerifyEmailSchema } = await import('@aidream/core')

    expect(
      VerifyEmailSchema.safeParse({ token: createOneTimeToken() }).success,
    ).toBe(true)
  })
})
