import { NotImplementedError } from '@aidream/core'
import type { Adapter } from 'next-auth/adapters'

/**
 * `packages/db` 의 인증 저장소 위에 Auth.js Adapter 계약을 조립한다.
 * PrismaClient 를 이 파일에서 직접 다루지 않는다. (HARNESS.md §4)
 */
export function createAuthAdapter(): Adapter {
  throw new NotImplementedError('T03:authAdapter')
}
