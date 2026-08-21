import type { ResetPasswordInput } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

/** 1회용 토큰을 소비하고 비밀번호를 바꾼 뒤 전 세션을 무효화한다. */
export function resetPassword(_input: ResetPasswordInput): Promise<void> {
  throw new NotImplementedError('T03:passwordReset')
}
