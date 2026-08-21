import { NotImplementedError } from '@aidream/core'

/** OWASP 권장값. (07_AUTH_SECURITY.md §1) */
export const ARGON2_PARAMS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

export function hashPassword(_plain: string): Promise<string> {
  throw new NotImplementedError('T03:password')
}

/**
 * 해시가 없는 계정(소셜 전용)에도 **더미 해시로 검증을 수행**해 응답 시간을
 * 맞춘다. 계정 존재 여부가 타이밍으로 드러나면 안 된다. (T03 §6)
 */
export function verifyPassword(
  _hash: string | null,
  _plain: string,
): Promise<boolean> {
  throw new NotImplementedError('T03:password')
}
