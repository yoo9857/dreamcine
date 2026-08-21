import type { RequestPasswordResetInput } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

/** 토큰 TTL 1시간. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000

/**
 * 계정이 없어도 성공으로 끝난다. 존재 여부를 노출하지 않는다.
 * (07_AUTH_SECURITY.md §11)
 */
export function requestPasswordReset(
  _input: RequestPasswordResetInput,
): Promise<void> {
  throw new NotImplementedError('T03:passwordReset')
}
