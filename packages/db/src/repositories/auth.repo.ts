import type { User } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

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

export function createAuthSession(
  _input: AuthSessionRow,
): Promise<AuthSessionRow> {
  throw new NotImplementedError('T03:authRepo')
}

export function findSessionAndUser(
  _sessionToken: string,
): Promise<SessionWithUser | null> {
  throw new NotImplementedError('T03:authRepo')
}

export function updateAuthSessionExpiry(
  _sessionToken: string,
  _expires: Date,
): Promise<AuthSessionRow | null> {
  throw new NotImplementedError('T03:authRepo')
}

export function deleteAuthSession(_sessionToken: string): Promise<void> {
  throw new NotImplementedError('T03:authRepo')
}

export function deleteAuthSessionsByUser(_userId: string): Promise<number> {
  throw new NotImplementedError('T03:authRepo')
}

export function linkAuthAccount(
  _input: AuthAccountInput,
): Promise<AuthAccountRow> {
  throw new NotImplementedError('T03:authRepo')
}

export function findUserByAuthAccount(
  _provider: string,
  _providerAccountId: string,
): Promise<User | null> {
  throw new NotImplementedError('T03:authRepo')
}

export function unlinkAuthAccount(
  _provider: string,
  _providerAccountId: string,
): Promise<void> {
  throw new NotImplementedError('T03:authRepo')
}

export function createVerificationToken(
  _input: VerificationTokenRow,
): Promise<VerificationTokenRow> {
  throw new NotImplementedError('T03:authRepo')
}

/** 일회용 토큰: 조회와 삭제를 하나의 트랜잭션에서 수행한다. */
export function consumeVerificationToken(
  _token: string,
): Promise<VerificationTokenRow | null> {
  throw new NotImplementedError('T03:authRepo')
}

export function deleteVerificationTokensFor(
  _identifier: string,
): Promise<number> {
  throw new NotImplementedError('T03:authRepo')
}

export function setUserEmailVerified(
  _userId: string,
  _verifiedAt: Date,
): Promise<User> {
  throw new NotImplementedError('T03:authRepo')
}

export function updateUserPasswordHash(
  _userId: string,
  _passwordHash: string,
): Promise<User> {
  throw new NotImplementedError('T03:authRepo')
}
