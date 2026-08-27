import { AppError, type VerifyEmailInput } from '@aidream/core'
import {
  consumeVerificationToken,
  findUserByEmail,
  setUserEmailVerified,
} from '@aidream/db'

import { getLogger } from '@/src/lib/logger'
import { mailTransportConfigured, sendWelcomeMail } from '@/src/lib/mail'

import { VERIFY_TOKEN_PREFIX } from './signup'

export interface VerifyEmailResult {
  userId: string
  emailVerified: string
}

/**
 * 일회용 토큰을 소비하고 `emailVerified` 를 설정한다.
 *
 * 만료된 토큰도 소비 단계에서 함께 제거된다 — 쓰레기 토큰이 남지 않는다.
 * 만료는 `E_VALIDATION` 이며 화면은 재발송 버튼을 보여준다. (T03 §6)
 */
export async function verifyEmail(
  input: VerifyEmailInput,
): Promise<VerifyEmailResult> {
  const consumed = await consumeVerificationToken(input.token)
  if (consumed === null) {
    throw new AppError('E_VALIDATION', { reason: 'token-unknown' })
  }
  if (!consumed.identifier.startsWith(VERIFY_TOKEN_PREFIX)) {
    throw new AppError('E_VALIDATION', { reason: 'token-purpose' })
  }
  if (consumed.expires.getTime() <= Date.now()) {
    throw new AppError('E_VALIDATION', { reason: 'token-expired' })
  }

  const email = consumed.identifier.slice(VERIFY_TOKEN_PREFIX.length)
  const user = await findUserByEmail(email)
  if (user === null) {
    throw new AppError('E_USER_NOT_FOUND')
  }

  if (user.emailVerified !== null) {
    return {
      userId: user.id,
      emailVerified: user.emailVerified.toISOString(),
    }
  }

  const verifiedAt = new Date()
  const updated = await setUserEmailVerified(user.id, verifiedAt)
  if (mailTransportConfigured()) {
    try {
      await sendWelcomeMail({
        to: updated.email,
        handle: updated.handle,
        locale: updated.locale.startsWith('en') ? 'en' : 'ko',
      })
    } catch (error: unknown) {
      getLogger().error(
        { err: error, userId: updated.id },
        'welcome mail delivery failed',
      )
    }
  }
  return {
    userId: updated.id,
    emailVerified: (updated.emailVerified ?? verifiedAt).toISOString(),
  }
}
