import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { AppError } from '@aidream/core'
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const originalDatabaseUrl = process.env.DATABASE_URL
const originalAuthSecret = process.env.AUTH_SECRET

let container: StartedPostgreSqlContainer
let database: typeof import('../src/client.js').db
let repo: typeof import('../src/index.js')

function expectCode(error: unknown, code: AppError['code']): void {
  expect(error).toBeInstanceOf(AppError)
  if (!(error instanceof AppError)) {
    throw error
  }
  expect(error.code).toBe(code)
}

async function createFixtureUser(suffix: string): Promise<string> {
  const user = await repo.createUser({
    handle: `user_${suffix}`,
    email: `user_${suffix}@example.com`,
    displayName: `User ${suffix}`,
    passwordHash: `$argon2id$v=19$fake-${suffix}`,
  })
  return user.id
}

function futureDate(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000)
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('aidream_auth_test')
    .withUsername('aidream_test')
    .withPassword('aidream_test_password')
    .start()

  process.env.DATABASE_URL = `postgresql://aidream_test:aidream_test_password@${container.getHost()}:${String(container.getMappedPort(5432))}/aidream_auth_test?schema=public`
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

  database = (await import('../src/client.js')).db
  repo = await import('../src/index.js')
}, 150_000)

beforeEach(async () => {
  await database.$executeRaw`TRUNCATE TABLE "user" CASCADE`
  await database.$executeRaw`TRUNCATE TABLE "verification_token" CASCADE`
})

afterAll(async () => {
  await database.$disconnect()
  await container.stop()
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl
  }
  if (originalAuthSecret === undefined) {
    delete process.env.AUTH_SECRET
  } else {
    process.env.AUTH_SECRET = originalAuthSecret
  }
})

describe('auth repository — sessions', () => {
  it('세션을 만들고 토큰으로 세션+사용자를 조회한다', async () => {
    const userId = await createFixtureUser('s1')
    const expires = futureDate(60)

    const created = await repo.createAuthSession({
      sessionToken: 'token-s1',
      userId,
      expires,
    })
    expect(created).toEqual({ sessionToken: 'token-s1', userId, expires })

    const found = await repo.findSessionAndUser('token-s1')
    expect(found?.user.id).toBe(userId)
    expect(found?.session.sessionToken).toBe('token-s1')
    // 세션 조회 결과에 비밀번호 해시가 딸려 나오는지 확인한다.
    // 도메인 User 는 해시를 포함하므로, 상위 계층이 노출하지 않아야 한다.
    expect(found?.user).toHaveProperty('passwordHash')
  })

  it('없는 토큰은 null 이다', async () => {
    await expect(repo.findSessionAndUser('nope')).resolves.toBeNull()
  })

  it('만료를 갱신한다 (rolling)', async () => {
    const userId = await createFixtureUser('s2')
    await repo.createAuthSession({
      sessionToken: 'token-s2',
      userId,
      expires: futureDate(10),
    })

    const extended = futureDate(60 * 24 * 30)
    const updated = await repo.updateAuthSessionExpiry('token-s2', extended)
    expect(updated?.expires).toEqual(extended)

    const reread = await repo.findSessionAndUser('token-s2')
    expect(reread?.session.expires).toEqual(extended)
  })

  it('없는 토큰의 갱신은 null 이다 (예외가 아니다)', async () => {
    await expect(
      repo.updateAuthSessionExpiry('nope', futureDate(10)),
    ).resolves.toBeNull()
  })

  it('세션을 지우면 조회 결과가 null 이다', async () => {
    const userId = await createFixtureUser('s3')
    await repo.createAuthSession({
      sessionToken: 'token-s3',
      userId,
      expires: futureDate(10),
    })

    await repo.deleteAuthSession('token-s3')
    await expect(repo.findSessionAndUser('token-s3')).resolves.toBeNull()
  })

  it('없는 세션을 지워도 성공한다 (멱등)', async () => {
    await expect(repo.deleteAuthSession('nope')).resolves.toBeUndefined()
  })

  it('사용자의 모든 세션을 지우고 개수를 돌려준다', async () => {
    const userId = await createFixtureUser('s4')
    const otherId = await createFixtureUser('s5')
    for (const token of ['a', 'b', 'c']) {
      await repo.createAuthSession({
        sessionToken: `token-${token}`,
        userId,
        expires: futureDate(10),
      })
    }
    await repo.createAuthSession({
      sessionToken: 'token-other',
      userId: otherId,
      expires: futureDate(10),
    })

    await expect(repo.deleteAuthSessionsByUser(userId)).resolves.toBe(3)
    await expect(repo.findSessionAndUser('token-other')).resolves.not.toBeNull()
  })

  it('삭제된 사용자의 세션은 없는 것으로 취급한다', async () => {
    const userId = await createFixtureUser('s6')
    await repo.createAuthSession({
      sessionToken: 'token-s6',
      userId,
      expires: futureDate(10),
    })

    await database.$executeRaw`UPDATE "user" SET deleted_at = NOW() WHERE id = ${userId}`
    await expect(repo.findSessionAndUser('token-s6')).resolves.toBeNull()
  })
})

describe('auth repository — accounts', () => {
  it('OAuth 계정을 연결하고 provider 조합으로 사용자를 찾는다', async () => {
    const userId = await createFixtureUser('a1')

    const account = await repo.linkAuthAccount({
      userId,
      type: 'oidc',
      provider: 'google',
      providerAccountId: 'google-uid-1',
      accessToken: 'access',
      expiresAt: 1_700_000_000,
      scope: 'openid email',
    })
    expect(account).toMatchObject({
      userId,
      provider: 'google',
      providerAccountId: 'google-uid-1',
    })

    const found = await repo.findUserByAuthAccount('google', 'google-uid-1')
    expect(found?.id).toBe(userId)
  })

  it('같은 provider 조합을 두 번 연결하면 E_DB_CONFLICT', async () => {
    const userId = await createFixtureUser('a2')
    const input = {
      userId,
      type: 'oidc',
      provider: 'google',
      providerAccountId: 'google-uid-2',
    }
    await repo.linkAuthAccount(input)

    try {
      await repo.linkAuthAccount(input)
      throw new Error('expected conflict')
    } catch (error: unknown) {
      expectCode(error, 'E_DB_CONFLICT')
    }
  })

  it('없는 provider 조합은 null 이다', async () => {
    await expect(
      repo.findUserByAuthAccount('google', 'missing'),
    ).resolves.toBeNull()
  })

  it('연결을 해제하면 조회 결과가 null 이다', async () => {
    const userId = await createFixtureUser('a3')
    await repo.linkAuthAccount({
      userId,
      type: 'oidc',
      provider: 'google',
      providerAccountId: 'google-uid-3',
    })

    await repo.unlinkAuthAccount('google', 'google-uid-3')
    await expect(
      repo.findUserByAuthAccount('google', 'google-uid-3'),
    ).resolves.toBeNull()
  })
})

describe('auth repository — verification tokens', () => {
  it('토큰을 만들고 한 번만 소비한다', async () => {
    const expires = futureDate(60)
    await repo.createVerificationToken({
      identifier: 'verify:user@example.com',
      token: 'token-v1',
      expires,
    })

    const first = await repo.consumeVerificationToken('token-v1')
    expect(first).toEqual({
      identifier: 'verify:user@example.com',
      token: 'token-v1',
      expires,
    })
    await expect(repo.consumeVerificationToken('token-v1')).resolves.toBeNull()
  })

  it('만료된 토큰도 소비 시 함께 제거된다', async () => {
    await repo.createVerificationToken({
      identifier: 'verify:old@example.com',
      token: 'token-expired',
      expires: new Date(Date.now() - 60_000),
    })

    const consumed = await repo.consumeVerificationToken('token-expired')
    expect(consumed?.token).toBe('token-expired')
    await expect(
      repo.findVerificationTokensFor('verify:old@example.com'),
    ).resolves.toEqual([])
  })

  it('identifier 로 살아있는 토큰을 조회한다', async () => {
    await repo.createVerificationToken({
      identifier: 'reset:user@example.com',
      token: 'token-r1',
      expires: futureDate(30),
    })
    await repo.createVerificationToken({
      identifier: 'reset:user@example.com',
      token: 'token-r2',
      expires: futureDate(60),
    })

    const tokens = await repo.findVerificationTokensFor(
      'reset:user@example.com',
    )
    expect(tokens.map((row) => row.token)).toEqual(['token-r2', 'token-r1'])
  })

  it('identifier 의 토큰을 모두 지우고 개수를 돌려준다', async () => {
    await repo.createVerificationToken({
      identifier: 'reset:a@example.com',
      token: 'token-a1',
      expires: futureDate(30),
    })
    await repo.createVerificationToken({
      identifier: 'reset:b@example.com',
      token: 'token-b1',
      expires: futureDate(30),
    })

    await expect(
      repo.deleteVerificationTokensFor('reset:a@example.com'),
    ).resolves.toBe(1)
    await expect(
      repo.findVerificationTokensFor('reset:b@example.com'),
    ).resolves.toHaveLength(1)
  })

  it('같은 토큰 문자열을 두 번 만들면 E_DB_CONFLICT', async () => {
    const input = {
      identifier: 'verify:dup@example.com',
      token: 'token-dup',
      expires: futureDate(30),
    }
    await repo.createVerificationToken(input)

    try {
      await repo.createVerificationToken(input)
      throw new Error('expected conflict')
    } catch (error: unknown) {
      expectCode(error, 'E_DB_CONFLICT')
    }
  })
})

describe('auth repository — user mutations', () => {
  it('emailVerified 를 설정한다', async () => {
    const userId = await createFixtureUser('u1')
    const verifiedAt = new Date()

    const updated = await repo.setUserEmailVerified(userId, verifiedAt)
    expect(updated.emailVerified).toEqual(verifiedAt)
  })

  it('비밀번호 해시를 갱신한다', async () => {
    const userId = await createFixtureUser('u2')

    const updated = await repo.updateUserPasswordHash(userId, '$argon2id$new')
    expect(updated.passwordHash).toBe('$argon2id$new')
  })

  it('없는 사용자에 대한 갱신은 E_NOT_FOUND', async () => {
    try {
      await repo.updateUserPasswordHash('missing-id', '$argon2id$new')
      throw new Error('expected failure')
    } catch (error: unknown) {
      expectCode(error, 'E_NOT_FOUND')
    }
  })
})

describe('db health probe', () => {
  it('살아있는 DB 에서 ok 를 돌려준다', async () => {
    const health = await repo.checkDbHealth(2000)
    expect(health.ok).toBe(true)
    expect(health.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('타임아웃을 넘기면 E_DB_UNAVAILABLE', async () => {
    try {
      await repo.checkDbHealth(0)
      throw new Error('expected timeout')
    } catch (error: unknown) {
      expectCode(error, 'E_DB_UNAVAILABLE')
    }
  })
})
