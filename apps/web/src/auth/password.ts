import { randomBytes } from 'node:crypto'

import { hash, verify } from '@node-rs/argon2'
import { AppError } from '@aidream/core'

/**
 * OWASP 권장값. (07_AUTH_SECURITY.md §1)
 * `algorithm` 을 지정하지 않으면 @node-rs/argon2 의 기본값이 Argon2id 이고
 * `version` 기본값이 0x13 이므로 `$argon2id$v=19$` 형식이 나온다.
 */
export const ARGON2_PARAMS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

let dummyHash: Promise<string> | undefined

/**
 * 부팅 후 1회만 생성한다. 존재하지 않는 계정으로 로그인해도 실제 검증과 같은
 * 시간이 걸리게 만들어 **계정 존재 여부가 타이밍으로 드러나지 않게** 한다.
 */
function getDummyHash(): Promise<string> {
  dummyHash ??= hash(randomBytes(32).toString('hex'), ARGON2_PARAMS)
  return dummyHash
}

export async function hashPassword(plain: string): Promise<string> {
  try {
    return await hash(plain, ARGON2_PARAMS)
  } catch (error: unknown) {
    throw new AppError('E_INTERNAL', { reason: 'argon2-hash' }, error)
  }
}

/**
 * 해시가 없는 계정(소셜 전용)도 더미 해시로 검증을 수행한 뒤 false 를 돌린다.
 * 해시 형식이 손상된 경우는 버그이므로 `E_INTERNAL` 로 올린다. (T03 §6)
 */
export async function verifyPassword(
  passwordHash: string | null,
  plain: string,
): Promise<boolean> {
  const target = passwordHash ?? (await getDummyHash())
  try {
    const valid = await verify(target, plain, ARGON2_PARAMS)
    return passwordHash === null ? false : valid
  } catch (error: unknown) {
    if (passwordHash === null) {
      return false
    }
    throw new AppError('E_INTERNAL', { reason: 'argon2-verify' }, error)
  }
}
