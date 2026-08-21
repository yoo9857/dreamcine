import type { User } from '@aidream/core'
import type {
  Account as PrismaAccount,
  Session as PrismaSession,
  VerificationToken as PrismaVerificationToken,
} from '@prisma/client'
import { db } from '../client.js'
import { executeDb } from '../errors.js'
import { mapUser } from '../mappers/user.mapper.js'
import { withTransaction } from '../tx.js'

export interface AuthSessionRow {
  sessionToken: string
  userId: string
  expires: Date
}

export interface SessionWithUser {
  session: AuthSessionRow
  user: User
}

export interface AuthAccountInput {
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refreshToken?: string | null | undefined
  accessToken?: string | null | undefined
  expiresAt?: number | null | undefined
  tokenType?: string | null | undefined
  scope?: string | null | undefined
  idToken?: string | null | undefined
  sessionState?: string | null | undefined
}

export interface AuthAccountRow {
  id: string
  userId: string
  provider: string
  providerAccountId: string
}

export interface VerificationTokenRow {
  identifier: string
  token: string
  expires: Date
}

function mapSession(row: PrismaSession): AuthSessionRow {
  return {
    sessionToken: row.sessionToken,
    userId: row.userId,
    expires: row.expires,
  }
}

function mapAccount(row: PrismaAccount): AuthAccountRow {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider,
    providerAccountId: row.providerAccountId,
  }
}

function mapVerificationToken(
  row: PrismaVerificationToken,
): VerificationTokenRow {
  return {
    identifier: row.identifier,
    token: row.token,
    expires: row.expires,
  }
}

export function createAuthSession(
  input: AuthSessionRow,
): Promise<AuthSessionRow> {
  return executeDb(async () =>
    mapSession(await db.session.create({ data: input })),
  )
}

/** 삭제된 사용자의 세션은 존재하지 않는 것으로 취급한다. */
export function findSessionAndUser(
  sessionToken: string,
): Promise<SessionWithUser | null> {
  return executeDb(async () => {
    const row = await db.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    })
    if (row === null || row.user.deletedAt !== null) {
      return null
    }
    return { session: mapSession(row), user: mapUser(row.user) }
  })
}

export function updateAuthSessionExpiry(
  sessionToken: string,
  expires: Date,
): Promise<AuthSessionRow | null> {
  return executeDb(async () => {
    const existing = await db.session.findUnique({ where: { sessionToken } })
    if (existing === null) {
      return null
    }
    return mapSession(
      await db.session.update({ where: { sessionToken }, data: { expires } }),
    )
  })
}

/** 멱등: 없는 토큰을 지워도 성공이다. */
export function deleteAuthSession(sessionToken: string): Promise<void> {
  return executeDb(async () => {
    await db.session.deleteMany({ where: { sessionToken } })
  })
}

export function deleteAuthSessionsByUser(userId: string): Promise<number> {
  return executeDb(async () => {
    const result = await db.session.deleteMany({ where: { userId } })
    return result.count
  })
}

export function linkAuthAccount(
  input: AuthAccountInput,
): Promise<AuthAccountRow> {
  return executeDb(async () =>
    mapAccount(
      await db.account.create({
        data: {
          userId: input.userId,
          type: input.type,
          provider: input.provider,
          providerAccountId: input.providerAccountId,
          refresh_token: input.refreshToken ?? null,
          access_token: input.accessToken ?? null,
          expires_at: input.expiresAt ?? null,
          token_type: input.tokenType ?? null,
          scope: input.scope ?? null,
          id_token: input.idToken ?? null,
          session_state: input.sessionState ?? null,
        },
      }),
    ),
  )
}

export function findUserByAuthAccount(
  provider: string,
  providerAccountId: string,
): Promise<User | null> {
  return executeDb(async () => {
    const row = await db.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    })
    if (row === null || row.user.deletedAt !== null) {
      return null
    }
    return mapUser(row.user)
  })
}

export function unlinkAuthAccount(
  provider: string,
  providerAccountId: string,
): Promise<void> {
  return executeDb(async () => {
    await db.account.deleteMany({ where: { provider, providerAccountId } })
  })
}

export function createVerificationToken(
  input: VerificationTokenRow,
): Promise<VerificationTokenRow> {
  return executeDb(async () =>
    mapVerificationToken(await db.verificationToken.create({ data: input })),
  )
}

/**
 * 일회용 토큰. 조회와 삭제를 한 트랜잭션에서 수행하므로 동시에 두 번 소비되지
 * 않는다. 만료 판정은 호출자(서비스 계층)가 한다 — 만료된 토큰도 여기서 제거된다.
 */
export function consumeVerificationToken(
  token: string,
): Promise<VerificationTokenRow | null> {
  return withTransaction(async (tx) => {
    const row = await tx.verificationToken.findUnique({ where: { token } })
    if (row === null) {
      return null
    }
    await tx.verificationToken.delete({ where: { token } })
    return mapVerificationToken(row)
  })
}

/** 재발송·검증 시나리오에서 소비하지 않고 살아있는 토큰을 확인할 때 쓴다. */
export function findVerificationTokensFor(
  identifier: string,
): Promise<VerificationTokenRow[]> {
  return executeDb(async () => {
    const rows = await db.verificationToken.findMany({
      where: { identifier },
      orderBy: { expires: 'desc' },
    })
    return rows.map(mapVerificationToken)
  })
}

export function deleteVerificationTokensFor(
  identifier: string,
): Promise<number> {
  return executeDb(async () => {
    const result = await db.verificationToken.deleteMany({
      where: { identifier },
    })
    return result.count
  })
}

export function setUserEmailVerified(
  userId: string,
  verifiedAt: Date,
): Promise<User> {
  return executeDb(async () =>
    mapUser(
      await db.user.update({
        where: { id: userId, deletedAt: null },
        data: { emailVerified: verifiedAt },
      }),
    ),
  )
}

export function updateUserPasswordHash(
  userId: string,
  passwordHash: string,
): Promise<User> {
  return executeDb(async () =>
    mapUser(
      await db.user.update({
        where: { id: userId, deletedAt: null },
        data: { passwordHash },
      }),
    ),
  )
}
