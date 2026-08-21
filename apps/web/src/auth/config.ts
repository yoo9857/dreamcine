import { NotImplementedError } from '@aidream/core'
import type { NextAuthConfig } from 'next-auth'

/** 30일 rolling 세션. (07_AUTH_SECURITY.md §1) */
export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60

/** 접근 시 갱신 간격. */
export const SESSION_UPDATE_AGE_SEC = 24 * 60 * 60

export function createAuthConfig(): NextAuthConfig {
  throw new NotImplementedError('T03:authConfig')
}
