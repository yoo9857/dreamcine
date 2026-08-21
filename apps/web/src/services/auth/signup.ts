import type { SignupInput } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

export interface SignupResult {
  id: string
  handle: string
  email: string
  emailVerified: null
}

/**
 * 예약어 차단 → 중복 검사 → argon2 해시 → 인증메일 발송.
 * 메일 발송 실패는 가입 자체를 실패시키지 않는다. (T03 §6)
 */
export function signup(_input: SignupInput): Promise<SignupResult> {
  throw new NotImplementedError('T03:signup')
}
