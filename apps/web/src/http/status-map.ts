import type { ErrorCode } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

/**
 * 서버가 던지지 않는 클라이언트 전용 코드. HTTP 상태가 없으므로 상태 매핑에서
 * 제외된다. (09_ERROR_CATALOG.md §3 클라이언트 전용)
 */
export const CLIENT_ONLY_ERROR_CODES = [
  'E_OFFLINE',
  'E_PLAYER_UNSUPPORTED',
  'E_PLAYER_MEDIA_ERROR',
  'E_PLAYER_MANIFEST_ERROR',
] as const

export type ClientOnlyErrorCode = (typeof CLIENT_ONLY_ERROR_CODES)[number]

export type ServerErrorCode = Exclude<ErrorCode, ClientOnlyErrorCode>

export function httpStatusFor(_code: ErrorCode): number {
  throw new NotImplementedError('T03:statusMap')
}
