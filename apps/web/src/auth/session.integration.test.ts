import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { SESSION_COOKIE_NAMES } from './types'

const execFileAsync = promisify(execFile)

const originalEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
}

let container: StartedPostgreSqlContainer
let db: typeof import('@aidream/db')
let getSessionFromRequest: typeof import('./session').getSessionFromRequest
let hasSessionCookie: typeof import('./session').hasSessionCookie
let revokeSessionFromRequest: typeof import('./session').revokeSessionFromRequest
let createAuthAdapter: typeof import('./adapter').createAuthAdapter
let createAuthConfig: typeof import('./config').createAuthConfig
let SESSION_MAX_AGE_SEC: number
let SESSION_UPDATE_AGE_SEC: number

let counter = 0

function unique(prefix: string): string {
  counter += 1
  return `${prefix}${String(counter).padStart(3, '0')}`
}

async function makeUser(): Promise<{ id: string; email: string }> {
  const handle = unique('member_')
  const user = await db.createUser({
    handle,
    email: `${handle}@example.com`,
    displayName: '회원',
  })
  return { id: user.id, email: user.email }
}

function requestWithCookie(name: string, value: string): Request {
  return new Request('http://127.0.0.1:3000/api/me', {
    headers: { cookie: `${name}=${value}` },
  })
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('aidream_session_test')
    .withUsername('aidream_test')
    .withPassword('aidream_test_password')
    .start()

  process.env.DATABASE_URL = `postgresql://aidream_test:aidream_test_password@${container.getHost()}:${String(container.getMappedPort(5432))}/aidream_session_test?schema=public`
  process.env.AUTH_SECRET =
    'integration-secret-that-is-at-least-thirty-two-bytes'

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
  const sessionModule = await import('./session')
  getSessionFromRequest = sessionModule.getSessionFromRequest
  hasSessionCookie = sessionModule.hasSessionCookie
  revokeSessionFromRequest = sessionModule.revokeSessionFromRequest
  SESSION_MAX_AGE_SEC = sessionModule.SESSION_MAX_AGE_SEC
  SESSION_UPDATE_AGE_SEC = sessionModule.SESSION_UPDATE_AGE_SEC
  createAuthAdapter = (await import('./adapter')).createAuthAdapter
  createAuthConfig = (await import('./config')).createAuthConfig
}, 180_000)

afterAll(async () => {
  await db.disconnectDb()
  await container.stop()
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key)
    } else {
      process.env[key] = value
    }
  }
})

describe('getSessionFromRequest', () => {
  it('쿠키가 없으면 null 이다', async () => {
    const request = new Request('http://127.0.0.1:3000/api/me')

    await expect(getSessionFromRequest(request)).resolves.toBeNull()
    expect(hasSessionCookie(request)).toBe(false)
  })

  it('살아있는 세션을 사용자와 함께 돌려준다', async () => {
    const user = await makeUser()
    const token = unique('token_')
    await db.createAuthSession({
      sessionToken: token,
      userId: user.id,
      expires: new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000),
    })

    const session = await getSessionFromRequest(
      requestWithCookie('authjs.session-token', token),
    )

    expect(session?.userId).toBe(user.id)
    expect(session?.user.email).toBe(user.email)
    expect(session?.user.status).toBe('ACTIVE')
    expect(session?.user.emailVerified).toBe(false)
    // 세션 사용자 계약에 비밀번호 해시가 새지 않아야 한다.
    expect(session?.user).not.toHaveProperty('passwordHash')
  })

  it('secure 접두 쿠키도 읽는다', async () => {
    const user = await makeUser()
    const token = unique('token_')
    await db.createAuthSession({
      sessionToken: token,
      userId: user.id,
      expires: new Date(Date.now() + 60_000),
    })

    const request = requestWithCookie('__Secure-authjs.session-token', token)
    expect(hasSessionCookie(request)).toBe(true)
    await expect(getSessionFromRequest(request)).resolves.not.toBeNull()
  })

  it('여러 쿠키가 섞여 있어도 세션 쿠키를 찾는다', async () => {
    const user = await makeUser()
    const token = unique('token_')
    await db.createAuthSession({
      sessionToken: token,
      userId: user.id,
      expires: new Date(Date.now() + 60_000),
    })

    const request = new Request('http://127.0.0.1:3000/api/me', {
      headers: {
        cookie: `theme=dark; authjs.session-token=${token}; locale=ko`,
      },
    })

    await expect(getSessionFromRequest(request)).resolves.not.toBeNull()
  })

  it('만료된 세션은 null 이고 행을 지운다', async () => {
    const user = await makeUser()
    const token = unique('token_')
    await db.createAuthSession({
      sessionToken: token,
      userId: user.id,
      expires: new Date(Date.now() - 1000),
    })

    await expect(
      getSessionFromRequest(requestWithCookie('authjs.session-token', token)),
    ).resolves.toBeNull()
    await expect(db.findSessionAndUser(token)).resolves.toBeNull()
  })

  it('갱신 주기를 넘긴 세션은 만료를 연장한다 (rolling)', async () => {
    const user = await makeUser()
    const token = unique('token_')
    const shortExpiry = new Date(
      Date.now() + (SESSION_MAX_AGE_SEC - SESSION_UPDATE_AGE_SEC) * 1000 - 5000,
    )
    await db.createAuthSession({
      sessionToken: token,
      userId: user.id,
      expires: shortExpiry,
    })

    const session = await getSessionFromRequest(
      requestWithCookie('authjs.session-token', token),
    )

    expect(session?.expiresAt.getTime()).toBeGreaterThan(shortExpiry.getTime())
    const stored = await db.findSessionAndUser(token)
    expect(stored?.session.expires.getTime()).toBeGreaterThan(
      shortExpiry.getTime(),
    )
  })

  it('갱신 주기 안이면 만료를 건드리지 않는다', async () => {
    const user = await makeUser()
    const token = unique('token_')
    const freshExpiry = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000)
    await db.createAuthSession({
      sessionToken: token,
      userId: user.id,
      expires: freshExpiry,
    })

    const session = await getSessionFromRequest(
      requestWithCookie('authjs.session-token', token),
    )

    expect(session?.expiresAt.getTime()).toBe(freshExpiry.getTime())
  })

  it('없는 토큰은 null 이다', async () => {
    await expect(
      getSessionFromRequest(
        requestWithCookie('authjs.session-token', 'no-such-token'),
      ),
    ).resolves.toBeNull()
  })

  it('SESSION_COOKIE_NAMES 는 secure 이름을 먼저 본다', () => {
    expect([...SESSION_COOKIE_NAMES]).toEqual([
      '__Secure-authjs.session-token',
      'authjs.session-token',
    ])
  })
})

describe('revokeSessionFromRequest', () => {
  it('요청의 세션을 지운다', async () => {
    const user = await makeUser()
    const token = unique('token_')
    await db.createAuthSession({
      sessionToken: token,
      userId: user.id,
      expires: new Date(Date.now() + 60_000),
    })

    await revokeSessionFromRequest(
      requestWithCookie('authjs.session-token', token),
    )

    await expect(db.findSessionAndUser(token)).resolves.toBeNull()
  })

  it('쿠키가 없으면 아무 일도 하지 않는다', async () => {
    await expect(
      revokeSessionFromRequest(new Request('http://127.0.0.1:3000/api/me')),
    ).resolves.toBeUndefined()
  })
})

describe('Auth.js adapter', () => {
  it('OAuth 가입자에게 이메일 로컬파트에서 핸들을 만들어 준다', async () => {
    const adapter = createAuthAdapter()

    const created = await adapter.createUser?.({
      id: 'ignored-by-db',
      email: `${unique('oauth_')}@example.com`,
      emailVerified: null,
      name: '구글 사용자',
    })

    expect(created?.id).toBeDefined()
    expect(created?.emailVerified).not.toBeNull()
    const stored = await db.findUserById(created?.id ?? '')
    expect(stored?.handle).toMatch(/^oauth_\d{3}/u)
    expect(stored?.displayName).toBe('구글 사용자')
  })

  it('핸들이 이미 쓰이면 접미를 붙여 만든다', async () => {
    const adapter = createAuthAdapter()
    const local = unique('taken_')
    await db.createUser({
      handle: local,
      email: `${local}@other.example.com`,
      displayName: '먼저 가입한 사람',
    })

    const created = await adapter.createUser?.({
      id: 'ignored',
      email: `${local}@example.com`,
      emailVerified: null,
    })

    const stored = await db.findUserById(created?.id ?? '')
    expect(stored?.handle).not.toBe(local)
    expect(stored?.handle.startsWith(local.slice(0, 6))).toBe(true)
  })

  it('이름이 없으면 핸들을 표시이름으로 쓴다', async () => {
    const adapter = createAuthAdapter()

    const created = await adapter.createUser?.({
      id: 'ignored',
      email: `${unique('noname_')}@example.com`,
      emailVerified: null,
    })

    const stored = await db.findUserById(created?.id ?? '')
    expect(stored?.displayName).toBe(stored?.handle)
  })

  it('id · email 로 사용자를 찾는다', async () => {
    const adapter = createAuthAdapter()
    const user = await makeUser()

    await expect(adapter.getUser?.(user.id)).resolves.toMatchObject({
      id: user.id,
    })
    await expect(adapter.getUserByEmail?.(user.email)).resolves.toMatchObject({
      id: user.id,
    })
    await expect(adapter.getUser?.('missing')).resolves.toBeNull()
    await expect(
      adapter.getUserByEmail?.('missing@example.com'),
    ).resolves.toBeNull()
  })

  it('계정을 연결하고 provider 조합으로 찾는다', async () => {
    const adapter = createAuthAdapter()
    const user = await makeUser()
    const providerAccountId = unique('google_uid_')

    await adapter.linkAccount?.({
      userId: user.id,
      type: 'oidc',
      provider: 'google',
      providerAccountId,
      access_token: 'access',
      expires_at: 1_700_000_000,
      scope: 'openid email',
      token_type: 'bearer',
      id_token: 'id-token',
    })

    await expect(
      adapter.getUserByAccount?.({ provider: 'google', providerAccountId }),
    ).resolves.toMatchObject({ id: user.id })

    await adapter.unlinkAccount?.({ provider: 'google', providerAccountId })
    await expect(
      adapter.getUserByAccount?.({ provider: 'google', providerAccountId }),
    ).resolves.toBeNull()
  })

  it('표시이름과 emailVerified 를 갱신한다', async () => {
    const adapter = createAuthAdapter()
    const user = await makeUser()
    const verifiedAt = new Date()

    const updated = await adapter.updateUser?.({
      id: user.id,
      name: '바뀐 이름',
      emailVerified: verifiedAt,
    })

    expect(updated?.name).toBe('바뀐 이름')
    expect(updated?.emailVerified).toEqual(verifiedAt)
  })

  it('바꿀 것이 없으면 현재 사용자를 그대로 돌려준다', async () => {
    const adapter = createAuthAdapter()
    const user = await makeUser()

    await expect(adapter.updateUser?.({ id: user.id })).resolves.toMatchObject({
      id: user.id,
    })
  })

  it('세션을 만들고 조회·갱신·삭제한다', async () => {
    const adapter = createAuthAdapter()
    const user = await makeUser()
    const sessionToken = unique('adapter_token_')
    const expires = new Date(Date.now() + 60_000)

    await adapter.createSession?.({ sessionToken, userId: user.id, expires })

    const found = await adapter.getSessionAndUser?.(sessionToken)
    expect(found?.user.id).toBe(user.id)
    expect(found?.session.sessionToken).toBe(sessionToken)

    const extended = new Date(Date.now() + 120_000)
    await expect(
      adapter.updateSession?.({ sessionToken, expires: extended }),
    ).resolves.toMatchObject({ expires: extended })

    await adapter.deleteSession?.(sessionToken)
    await expect(adapter.getSessionAndUser?.(sessionToken)).resolves.toBeNull()
  })

  it('expires 없는 세션 갱신은 null 이다', async () => {
    const adapter = createAuthAdapter()

    await expect(
      adapter.updateSession?.({ sessionToken: 'whatever' }),
    ).resolves.toBeNull()
  })

  it('일회용 토큰을 만들고 identifier 가 맞을 때만 소비한다', async () => {
    const adapter = createAuthAdapter()
    const identifier = `verify:${unique('token_owner_')}@example.com`
    const token = unique('adapter_verify_')

    await adapter.createVerificationToken?.({
      identifier,
      token,
      expires: new Date(Date.now() + 60_000),
    })

    await expect(
      adapter.useVerificationToken?.({ identifier: 'verify:other', token }),
    ).resolves.toBeNull()
    // identifier 가 어긋나도 토큰은 소비된다. 재사용 창을 남기지 않는다.
    await expect(
      adapter.useVerificationToken?.({ identifier, token }),
    ).resolves.toBeNull()
  })

  it('맞는 identifier 로는 토큰을 돌려준다', async () => {
    const adapter = createAuthAdapter()
    const identifier = `verify:${unique('token_owner_')}@example.com`
    const token = unique('adapter_verify_')

    await adapter.createVerificationToken?.({
      identifier,
      token,
      expires: new Date(Date.now() + 60_000),
    })

    await expect(
      adapter.useVerificationToken?.({ identifier, token }),
    ).resolves.toMatchObject({ identifier, token })
  })
})

describe('Credentials + DB 세션 브리지', () => {
  it('jwt.encode 가 실제 Session 행을 만들고 그 토큰을 돌려준다', async () => {
    const user = await makeUser()
    const config = createAuthConfig()

    const sessionToken = await config.jwt?.encode?.({
      token: { sub: user.id },
      secret: 'secret',
      salt: 'salt',
    })

    expect(sessionToken).toBeDefined()
    const stored = await db.findSessionAndUser(sessionToken ?? '')
    expect(stored?.user.id).toBe(user.id)
    expect(stored?.session.expires.getTime()).toBeGreaterThan(Date.now())
  })

  it('그렇게 만든 세션을 getSessionFromRequest 가 읽는다', async () => {
    const user = await makeUser()
    const config = createAuthConfig()
    const sessionToken =
      (await config.jwt?.encode?.({
        token: { sub: user.id },
        secret: 'secret',
        salt: 'salt',
      })) ?? ''

    const session = await getSessionFromRequest(
      requestWithCookie('authjs.session-token', sessionToken),
    )

    expect(session?.userId).toBe(user.id)
  })
})
