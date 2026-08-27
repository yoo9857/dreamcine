import type { User } from '@aidream/core'
import {
  deleteAuthSession,
  findSessionAndUser,
  updateAuthSessionExpiry,
} from '@aidream/db'

import { SESSION_COOKIE_NAMES } from './types'
import type { RouteSession, SessionUser } from './types'

/** 30일 rolling 세션. (07_AUTH_SECURITY.md §1) */
export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60

/** 접근 시 갱신 간격. 이 주기보다 자주 만료를 다시 쓰지 않는다. */
export const SESSION_UPDATE_AGE_SEC = 24 * 60 * 60

function readCookies(req: Request): Map<string, string> {
  const jar = new Map<string, string>()
  const header = req.headers.get('cookie')
  if (header === null) {
    return jar
  }
  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) {
      continue
    }
    const name = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    if (name !== '' && !jar.has(name)) {
      jar.set(name, decodeURIComponent(value))
    }
  }
  return jar
}

function sessionTokenFrom(req: Request): string | undefined {
  const jar = readCookies(req)
  for (const name of SESSION_COOKIE_NAMES) {
    const value = jar.get(name)
    if (value !== undefined && value !== '') {
      return value
    }
  }
  return undefined
}

/** 만료된 쿠키를 지울지 판단하려면 "쿠키가 있었는가" 를 알아야 한다. */
export function hasSessionCookie(req: Request): boolean {
  return sessionTokenFrom(req) !== undefined
}

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    handle: user.handle,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified !== null,
    tier: user.tier,
    isVerified: user.verifiedAt !== null,
  }
}

/**
 * 세션 해석의 **단일 지점**.
 *
 * Phase 2(T13) 네이티브 앱은 쿠키를 쓰기 어렵다. `Authorization: Bearer` 지원이
 * 필요해지면 아래 `sessionTokenFrom` 한 곳만 확장한다 — 호출자는 바뀌지 않는다.
 * (07_AUTH_SECURITY.md §1 Phase 2 대비)
 */
export async function getSessionFromRequest(
  req: Request,
): Promise<RouteSession | null> {
  return getSessionByToken(sessionTokenFrom(req))
}

/**
 * 토큰으로부터의 세션 해석. `getSessionFromRequest` 와 서버 컴포넌트가
 * **같은 판정**을 쓰게 하려고 갈라 두었다 — 만료·롤링·정지 처리가 두 벌이 되면
 * 한쪽만 고쳐지는 날이 온다.
 */
export async function getSessionByToken(
  token: string | undefined,
): Promise<RouteSession | null> {
  if (token === undefined) {
    return null
  }

  const found = await findSessionAndUser(token)
  if (found === null) {
    return null
  }

  // 이메일 링크를 열기 전의 계정은 가입 대기 상태다. 과거 버전에서 만들어진
  // 세션도 여기서 즉시 폐기해 미인증 사용자가 로그인 상태로 남지 않게 한다.
  if (found.user.emailVerified === null) {
    await deleteAuthSession(token)
    return null
  }

  const nowMs = Date.now()
  const expiresMs = found.session.expires.getTime()
  if (expiresMs <= nowMs) {
    await deleteAuthSession(token)
    return null
  }

  // rolling: 남은 수명이 (최대수명 - 갱신주기) 아래로 내려가면 연장한다.
  // 30일/1일 설정에서는 하루에 한 번만 쓰기가 일어난다.
  let expiresAt = found.session.expires
  const refreshThresholdMs =
    (SESSION_MAX_AGE_SEC - SESSION_UPDATE_AGE_SEC) * 1000
  if (expiresMs - nowMs < refreshThresholdMs) {
    const extended = new Date(nowMs + SESSION_MAX_AGE_SEC * 1000)
    const updated = await updateAuthSessionExpiry(token, extended)
    expiresAt = updated?.expires ?? extended
  }

  return {
    userId: found.user.id,
    user: toSessionUser(found.user),
    expiresAt,
  }
}

/**
 * 쿠키 저장소(서버 컴포넌트의 `cookies()`)에서 세션 토큰을 찾는다.
 * 이름 목록은 `SESSION_COOKIE_NAMES` 한 곳에서만 온다.
 */
export function sessionTokenFromCookies(
  read: (name: string) => string | undefined,
): string | undefined {
  for (const name of SESSION_COOKIE_NAMES) {
    const value = read(name)
    if (value !== undefined && value !== '') {
      return value
    }
  }
  return undefined
}

/** 정지 계정 감지 등 즉시 무효화가 필요할 때 쓴다. (07_AUTH_SECURITY.md §1) */
export async function revokeSessionFromRequest(req: Request): Promise<void> {
  const token = sessionTokenFrom(req)
  if (token !== undefined) {
    await deleteAuthSession(token)
  }
}
