import type { VerifyEmailInput } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

export interface VerifyEmailResult {
  userId: string
  emailVerified: string
}

/** 일회용 토큰을 소비하고 `emailVerified` 를 설정한다. */
export function verifyEmail(
  _input: VerifyEmailInput,
): Promise<VerifyEmailResult> {
  throw new NotImplementedError('T03:verifyEmail')
}
