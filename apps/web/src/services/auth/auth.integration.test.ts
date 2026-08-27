import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { AppError } from '@aidream/core'
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

const originalEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  APP_URL: process.env.APP_URL,
  SMTP_URL: process.env.SMTP_URL,
  MAIL_FROM: process.env.MAIL_FROM,
  CDN_BASE_URL: process.env.CDN_BASE_URL,
  NEXT_PUBLIC_CDN_BASE_URL: process.env.NEXT_PUBLIC_CDN_BASE_URL,
}

let container: StartedPostgreSqlContainer
let db: typeof import('@aidream/db')
let signup: typeof import('./signup').signup
let verifyEmail: typeof import('./verify-email').verifyEmail
let requestPasswordReset: typeof import('./request-password-reset').requestPasswordReset
let resetPassword: typeof import('./reset-password').resetPassword
let getMe: typeof import('./get-me').getMe
let updateMe: typeof import('./update-me').updateMe
let verifyPassword: typeof import('@/src/auth/password').verifyPassword
let VERIFY_TOKEN_PREFIX: string
let RESET_TOKEN_PREFIX: string

interface Credentials {
  email: string
  emailConfirmation: string
  password: string
  handle: string
  displayName: string
  birthDate: string
  gender: 'PREFER_NOT_TO_SAY'
  signupPurpose: 'CREATOR'
  country: 'KR'
  acceptTerms: true
  marketingConsent: false
}

let counter = 0

/**
 * 테스트마다 독립 계정을 만든다. `packages/db` 는 PrismaClient 를 외부에
 * 노출하지 않으므로 TRUNCATE 로 격리하지 않고, 계정을 겹치지 않게 만든다.
 * (O06_TESTING_QA.md §6 — 계정 공유는 순서 의존을 만든다)
 */
function credentials(): Credentials {
  counter += 1
  const suffix = String(counter).padStart(3, '0')
  const email = `creator_${suffix}@example.com`
  return {
    email,
    emailConfirmation: email,
    password: 'correct horse battery',
    handle: `creator_${suffix}`,
    birthDate: '1995-06-15',
    gender: 'PREFER_NOT_TO_SAY',
    signupPurpose: 'CREATOR',
    country: 'KR',
    acceptTerms: true,
    marketingConsent: false,
    displayName: '드라마 제작자',
  }
}

function expectCode(error: unknown, code: AppError['code']): void {
  expect(error).toBeInstanceOf(AppError)
  if (!(error instanceof AppError)) {
    throw error
  }
  expect(error.code).toBe(code)
}

async function liveToken(identifier: string): Promise<string> {
  const tokens = await db.findVerificationTokensFor(identifier)
  const first = tokens[0]
  if (first === undefined) {
    throw new Error(`no verification token for ${identifier}`)
  }
  return first.token
}

function verifyIdentifier(email: string): string {
  return `${VERIFY_TOKEN_PREFIX}${email}`
}

function resetIdentifier(email: string): string {
  return `${RESET_TOKEN_PREFIX}${email}`
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('aidream_service_test')
    .withUsername('aidream_test')
    .withPassword('aidream_test_password')
    .start()

  process.env.DATABASE_URL = `postgresql://aidream_test:aidream_test_password@${container.getHost()}:${String(container.getMappedPort(5432))}/aidream_service_test?schema=public`
  process.env.AUTH_SECRET =
    'integration-secret-that-is-at-least-thirty-two-bytes'
  process.env.APP_URL = 'http://127.0.0.1:3000'
  process.env.CDN_BASE_URL = 'http://127.0.0.1:9002'
  process.env.NEXT_PUBLIC_CDN_BASE_URL = 'http://127.0.0.1:9002'
  // SMTP_URL 이 없으면 메일은 네트워크로 나가지 않는다. 토큰은 DB 에서 읽는다.
  delete process.env.SMTP_URL
  delete process.env.MAIL_FROM

  const executable =
    process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm'
  const prefix = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm'] : []
  await execFileAsync(
    executable,
    [
      ...prefix,
      'exec',
      'prisma',
      'migrate',
      'deploy',
      '--schema',
      'prisma/schema.prisma',
    ],
    { cwd: process.cwd(), env: process.env, windowsHide: true },
  )

  db = await import('@aidream/db')
  const signupModule = await import('./signup')
  signup = signupModule.signup
  VERIFY_TOKEN_PREFIX = signupModule.VERIFY_TOKEN_PREFIX
  verifyEmail = (await import('./verify-email')).verifyEmail
  const resetRequestModule = await import('./request-password-reset')
  requestPasswordReset = resetRequestModule.requestPasswordReset
  RESET_TOKEN_PREFIX = resetRequestModule.RESET_TOKEN_PREFIX
  resetPassword = (await import('./reset-password')).resetPassword
  getMe = (await import('./get-me')).getMe
  updateMe = (await import('./update-me')).updateMe
  verifyPassword = (await import('@/src/auth/password')).verifyPassword
}, 180_000)

afterAll(async () => {
  await db.disconnectDb()
  await container.stop()
  // 원래 값이 없던 변수는 빈 문자열이 아니라 '없음' 상태로 되돌려야 하므로
  // Reflect.deleteProperty 로 지운다.
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key)
    } else {
      process.env[key] = value
    }
  }
})

describe('signup', () => {
  it('가입하면 인증 대기 상태의 계정과 토큰이 생긴다', async () => {
    const input = credentials()

    const result = await signup(input)

    expect(result).toMatchObject({
      handle: input.handle,
      email: input.email,
      emailVerified: null,
    })
    const tokens = await db.findVerificationTokensFor(
      verifyIdentifier(input.email),
    )
    expect(tokens).toHaveLength(1)
    expect(tokens[0]?.expires.getTime()).toBeGreaterThan(Date.now())
  })

  it('비밀번호를 argon2 해시로 저장한다', async () => {
    const input = credentials()

    const result = await signup(input)

    const user = await db.findUserById(result.id)
    expect(user?.passwordHash?.startsWith('$argon2id$')).toBe(true)
    await expect(
      verifyPassword(user?.passwordHash ?? null, input.password),
    ).resolves.toBe(true)
  })

  it('예약어 핸들은 E_USER_HANDLE_TAKEN', async () => {
    try {
      await signup({ ...credentials(), handle: 'admin' })
      throw new Error('expected failure')
    } catch (error: unknown) {
      expectCode(error, 'E_USER_HANDLE_TAKEN')
    }
  })

  it('중복 이메일은 E_USER_EMAIL_TAKEN', async () => {
    const input = credentials()
    await signup(input)

    try {
      await signup({ ...credentials(), email: input.email })
      throw new Error('expected failure')
    } catch (error: unknown) {
      expectCode(error, 'E_USER_EMAIL_TAKEN')
    }
  })

  it('중복 핸들은 E_USER_HANDLE_TAKEN', async () => {
    const input = credentials()
    await signup(input)

    try {
      await signup({ ...credentials(), handle: input.handle })
      throw new Error('expected failure')
    } catch (error: unknown) {
      expectCode(error, 'E_USER_HANDLE_TAKEN')
    }
  })

  it('메일 발송이 실패해도 가입은 성공한다', async () => {
    // 닿을 수 없는 SMTP 주소를 준다. 발송은 실패하지만 계정은 남아야 한다.
    process.env.SMTP_URL = 'smtp://127.0.0.1:1'
    process.env.MAIL_FROM = 'noreply@example.com'
    try {
      const result = await signup(credentials())
      expect(await db.findUserById(result.id)).not.toBeNull()
    } finally {
      delete process.env.SMTP_URL
      delete process.env.MAIL_FROM
    }
  }, 30_000)
})

describe('verifyEmail', () => {
  it('토큰을 소비하고 emailVerified 를 채운다', async () => {
    const input = credentials()
    const created = await signup(input)
    const token = await liveToken(verifyIdentifier(input.email))

    const result = await verifyEmail({ token })

    expect(result.userId).toBe(created.id)
    const user = await db.findUserById(created.id)
    expect(user?.emailVerified).not.toBeNull()
  })

  it('토큰은 한 번만 소비된다', async () => {
    const input = credentials()
    await signup(input)
    const token = await liveToken(verifyIdentifier(input.email))
    await verifyEmail({ token })

    try {
      await verifyEmail({ token })
      throw new Error('expected failure')
    } catch (error: unknown) {
      expectCode(error, 'E_VALIDATION')
    }
  })

  it('만료된 토큰은 E_VALIDATION', async () => {
    const input = credentials()
    await signup(input)
    const identifier = verifyIdentifier(input.email)
    await db.deleteVerificationTokensFor(identifier)
    await db.createVerificationToken({
      identifier,
      token: `expired-${input.handle}`,
      expires: new Date(Date.now() - 1000),
    })

    try {
      await verifyEmail({ token: `expired-${input.handle}` })
      throw new Error('expected failure')
    } catch (error: unknown) {
      expectCode(error, 'E_VALIDATION')
    }
  })

  it('재설정 용도의 토큰으로는 인증되지 않는다', async () => {
    const input = credentials()
    await signup(input)
    await db.createVerificationToken({
      identifier: resetIdentifier(input.email),
      token: `reset-purpose-${input.handle}`,
      expires: new Date(Date.now() + 60_000),
    })

    try {
      await verifyEmail({ token: `reset-purpose-${input.handle}` })
      throw new Error('expected failure')
    } catch (error: unknown) {
      expectCode(error, 'E_VALIDATION')
    }
  })

  it('없는 토큰은 E_VALIDATION', async () => {
    try {
      await verifyEmail({ token: 'never-existed' })
      throw new Error('expected failure')
    } catch (error: unknown) {
      expectCode(error, 'E_VALIDATION')
    }
  })
})

describe('password reset', () => {
  it('없는 계정의 요청도 성공으로 끝난다', async () => {
    await expect(
      requestPasswordReset({ email: 'nobody@example.com' }),
    ).resolves.toBeUndefined()
    await expect(
      db.findVerificationTokensFor(resetIdentifier('nobody@example.com')),
    ).resolves.toEqual([])
  })

  it('요청하면 1시간 TTL 토큰이 생긴다', async () => {
    const input = credentials()
    await signup(input)

    await requestPasswordReset({ email: input.email })

    const tokens = await db.findVerificationTokensFor(
      resetIdentifier(input.email),
    )
    expect(tokens).toHaveLength(1)
    const ttlMs = (tokens[0]?.expires.getTime() ?? 0) - Date.now()
    expect(ttlMs).toBeGreaterThan(55 * 60_000)
    expect(ttlMs).toBeLessThanOrEqual(60 * 60_000)
  })

  it('재요청하면 기존 토큰을 대체한다', async () => {
    const input = credentials()
    await signup(input)

    await requestPasswordReset({ email: input.email })
    await requestPasswordReset({ email: input.email })

    await expect(
      db.findVerificationTokensFor(resetIdentifier(input.email)),
    ).resolves.toHaveLength(1)
  })

  it('비밀번호를 바꾸고 기존 세션을 모두 무효화한다', async () => {
    const input = credentials()
    const created = await signup(input)
    const sessionToken = `live-session-${input.handle}`
    await db.createAuthSession({
      sessionToken,
      userId: created.id,
      expires: new Date(Date.now() + 60_000),
    })
    await requestPasswordReset({ email: input.email })
    const token = await liveToken(resetIdentifier(input.email))

    await resetPassword({ token, password: 'a brand new password' })

    const user = await db.findUserById(created.id)
    await expect(
      verifyPassword(user?.passwordHash ?? null, 'a brand new password'),
    ).resolves.toBe(true)
    await expect(
      verifyPassword(user?.passwordHash ?? null, input.password),
    ).resolves.toBe(false)
    await expect(db.findSessionAndUser(sessionToken)).resolves.toBeNull()
  })

  it('재설정 토큰도 한 번만 쓸 수 있다', async () => {
    const input = credentials()
    await signup(input)
    await requestPasswordReset({ email: input.email })
    const token = await liveToken(resetIdentifier(input.email))
    await resetPassword({ token, password: 'a brand new password' })

    try {
      await resetPassword({ token, password: 'another new password' })
      throw new Error('expected failure')
    } catch (error: unknown) {
      expectCode(error, 'E_VALIDATION')
    }
  })

  it('인증 용도의 토큰으로는 재설정되지 않는다', async () => {
    const input = credentials()
    await signup(input)
    const token = await liveToken(verifyIdentifier(input.email))

    try {
      await resetPassword({ token, password: 'a brand new password' })
      throw new Error('expected failure')
    } catch (error: unknown) {
      expectCode(error, 'E_VALIDATION')
    }
  })
})

describe('profile', () => {
  it('내 프로필을 돌려준다', async () => {
    const input = credentials()
    const created = await signup(input)

    const me = await getMe(created.id)

    expect(me).toMatchObject({
      id: created.id,
      handle: input.handle,
      email: input.email,
      displayName: input.displayName,
      bio: null,
      avatarUrl: null,
      role: 'VIEWER',
      status: 'ACTIVE',
      emailVerified: null,
    })
  })

  it('응답에 비밀번호 해시가 없다', async () => {
    const created = await signup(credentials())

    expect(await getMe(created.id)).not.toHaveProperty('passwordHash')
  })

  it('없는 사용자는 E_USER_NOT_FOUND', async () => {
    try {
      await getMe('missing-id')
      throw new Error('expected failure')
    } catch (error: unknown) {
      expectCode(error, 'E_USER_NOT_FOUND')
    }
  })

  it('표시이름·소개·아바타를 수정하고 CDN URL 을 조립한다', async () => {
    const created = await signup(credentials())

    const updated = await updateMe(created.id, {
      displayName: '새 이름',
      bio: '소개글',
      avatarKey: 'avatars/user.webp',
    })

    expect(updated).toMatchObject({
      displayName: '새 이름',
      bio: '소개글',
      avatarUrl: 'http://127.0.0.1:9002/avatars/user.webp',
    })
  })

  it('빈 수정은 현재 값을 그대로 돌려준다', async () => {
    const created = await signup(credentials())

    const before = await getMe(created.id)
    await expect(updateMe(created.id, {})).resolves.toEqual(before)
  })

  it('null 로 소개와 아바타를 지운다', async () => {
    const created = await signup(credentials())
    await updateMe(created.id, { bio: '소개글', avatarKey: 'a/b.webp' })

    const cleared = await updateMe(created.id, { bio: null, avatarKey: null })

    expect(cleared.bio).toBeNull()
    expect(cleared.avatarUrl).toBeNull()
  })

  it('없는 사용자 수정은 E_USER_NOT_FOUND', async () => {
    try {
      await updateMe('missing-id', { displayName: '이름' })
      throw new Error('expected failure')
    } catch (error: unknown) {
      expectCode(error, 'E_USER_NOT_FOUND')
    }
  })
})
