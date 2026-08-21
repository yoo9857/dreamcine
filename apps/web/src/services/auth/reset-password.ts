import { AppError, type ResetPasswordInput } from '@aidream/core'
import {
  consumeVerificationToken,
  deleteAuthSessionsByUser,
  findUserByEmail,
  updateUserPasswordHash,
} from '@aidream/db'

import { hashPassword } from '@/src/auth/password'
import { getLogger } from '@/src/lib/logger'

import { RESET_TOKEN_PREFIX } from './request-password-reset'

/**
 * 1회용 토큰을 소비하고 비밀번호를 바꾼 뒤 **기존 세션을 전부 무효화한다.**
 * 비밀번호를 바꾸는 이유가 계정 탈취인 경우, 세션을 남겨두면 아무 의미가 없다.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const consumed = await consumeVerificationToken(input.token)
  if (consumed === null) {
    throw new AppError('E_VALIDATION', { reason: 'token-unknown' })
  }
  if (!consumed.identifier.startsWith(RESET_TOKEN_PREFIX)) {
    throw new AppError('E_VALIDATION', { reason: 'token-purpose' })
  }
  if (consumed.expires.getTime() <= Date.now()) {
    throw new AppError('E_VALIDATION', { reason: 'token-expired' })
  }

  const email = consumed.identifier.slice(RESET_TOKEN_PREFIX.length)
  const user = await findUserByEmail(email)
  if (user === null) {
    throw new AppError('E_VALIDATION', { reason: 'account-missing' })
  }

  await updateUserPasswordHash(user.id, await hashPassword(input.password))
  const revoked = await deleteAuthSessionsByUser(user.id)
  getLogger().info(
    { userId: user.id, revokedSessions: revoked },
    'password reset completed',
  )
}
