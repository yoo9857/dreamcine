import { randomInt } from 'node:crypto'

import { RESERVED_HANDLES, type User } from '@aidream/core'
import {
  consumeVerificationToken,
  createAuthSession,
  createUser,
  createVerificationToken,
  deleteAuthSession,
  findSessionAndUser,
  findUserByAuthAccount,
  findUserByEmail,
  findUserByHandle,
  findUserById,
  linkAuthAccount,
  setUserEmailVerified,
  unlinkAuthAccount,
  updateAuthSessionExpiry,
  updateUser,
} from '@aidream/db'
import type { Adapter, AdapterUser } from 'next-auth/adapters'

const HANDLE_MIN = 3
const HANDLE_MAX = 20
const HANDLE_ATTEMPTS = 8

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function toAdapterUser(user: User): AdapterUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.displayName,
  }
}

function handleSeed(email: string): string {
  const local = email.split('@')[0] ?? ''
  const cleaned = local.toLowerCase().replace(/[^a-z0-9_]/gu, '')
  const padded = cleaned.padEnd(HANDLE_MIN, '0')
  return padded.slice(0, HANDLE_MAX)
}

/**
 * OAuth 가입자는 핸들을 직접 고르지 않는다. 이메일 로컬파트에서 만들고,
 * 예약어이거나 이미 쓰이면 숫자 접미를 붙여 다시 시도한다.
 * (07_AUTH_SECURITY.md §5 사용자 생성 문자열 정책)
 */
async function allocateHandle(email: string): Promise<string> {
  const seed = handleSeed(email)
  const reserved: readonly string[] = RESERVED_HANDLES

  for (let attempt = 0; attempt < HANDLE_ATTEMPTS; attempt += 1) {
    const suffix = attempt === 0 ? '' : String(randomInt(1000, 1_000_000))
    const candidate = `${seed.slice(0, HANDLE_MAX - suffix.length)}${suffix}`
    if (reserved.includes(candidate)) {
      continue
    }
    if ((await findUserByHandle(candidate)) === null) {
      return candidate
    }
  }
  // 8회 모두 충돌하는 것은 사실상 불가능하다. 그래도 조용히 넘기지 않는다.
  throw new Error(`could not allocate a handle for ${email}`)
}

/**
 * `packages/db` 의 인증 저장소 위에 Auth.js Adapter 계약을 조립한다.
 * PrismaClient 를 이 파일에서 직접 다루지 않는다. (HARNESS.md §4)
 */
export function createAuthAdapter(): Adapter {
  return {
    createUser: async (user) => {
      // 이 경로는 **OAuth 가입만** 지나간다. 이메일/비밀번호 가입은
      // `services/auth/signup.ts` 가 처리한다.
      const handle = await allocateHandle(user.email)
      const created = await createUser({
        handle,
        email: user.email,
        displayName: user.name ?? handle,
      })
      // 공급자가 이미 소유를 확인한 이메일이므로 인증된 것으로 본다.
      const verified = await setUserEmailVerified(
        created.id,
        user.emailVerified ?? new Date(),
      )
      return toAdapterUser(verified)
    },

    getUser: async (id) => {
      const user = await findUserById(id)
      return user === null ? null : toAdapterUser(user)
    },

    getUserByEmail: async (email) => {
      const user = await findUserByEmail(email)
      return user === null ? null : toAdapterUser(user)
    },

    getUserByAccount: async ({ provider, providerAccountId }) => {
      const user = await findUserByAuthAccount(provider, providerAccountId)
      return user === null ? null : toAdapterUser(user)
    },

    updateUser: async ({ id, name, emailVerified }) => {
      const updated =
        name === undefined || name === null
          ? await findUserById(id)
          : await updateUser(id, { displayName: name })
      if (updated === null) {
        throw new Error(`user not found: ${id}`)
      }
      if (emailVerified === undefined || emailVerified === null) {
        return toAdapterUser(updated)
      }
      return toAdapterUser(await setUserEmailVerified(id, emailVerified))
    },

    linkAccount: async (account) => {
      await linkAuthAccount({
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refreshToken: asString(account.refresh_token),
        accessToken: asString(account.access_token),
        expiresAt: asNumber(account.expires_at),
        tokenType: asString(account.token_type),
        scope: asString(account.scope),
        idToken: asString(account.id_token),
        sessionState: asString(account.session_state),
      })
    },

    unlinkAccount: async ({ provider, providerAccountId }) => {
      await unlinkAuthAccount(provider, providerAccountId)
    },

    createSession: async (session) => createAuthSession(session),

    getSessionAndUser: async (sessionToken) => {
      const found = await findSessionAndUser(sessionToken)
      return found === null
        ? null
        : { session: found.session, user: toAdapterUser(found.user) }
    },

    updateSession: async ({ sessionToken, expires }) => {
      if (expires === undefined) {
        return null
      }
      return updateAuthSessionExpiry(sessionToken, expires)
    },

    deleteSession: async (sessionToken) => {
      await deleteAuthSession(sessionToken)
    },

    createVerificationToken: async (token) => createVerificationToken(token),

    useVerificationToken: async ({ identifier, token }) => {
      const consumed = await consumeVerificationToken(token)
      return consumed === null || consumed.identifier !== identifier
        ? null
        : consumed
    },
  }
}
