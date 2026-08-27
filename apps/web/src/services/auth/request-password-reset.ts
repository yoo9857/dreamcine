import type { RequestPasswordResetInput } from '@aidream/core'
import {
  createVerificationToken,
  deleteVerificationTokensFor,
  findUserByEmail,
} from '@aidream/db'

import { getLogger } from '@/src/lib/logger'
import { sendPasswordResetMail } from '@/src/lib/mail'

import { createOneTimeToken } from './signup'

export interface RequestPasswordResetIntent extends RequestPasswordResetInput {
  /**
   * `exactOptionalPropertyTypes` 아래에서 `undefined` 를 명시한다. zod 의
   * `.optional()` 결과는 "키 없음" 이 아니라 "값이 undefined" 이므로, 이것을
   * 빼면 파싱 결과를 그대로 넘길 수 없다.
   */
  readonly lang?: 'ko' | 'en' | undefined
}

/** 토큰 TTL 1시간. (T03 §5 #12) */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000

export const RESET_TOKEN_PREFIX = 'reset:'

/**
 * 계정이 없어도 성공으로 끝난다. 존재 여부를 노출하지 않는다.
 * (07_AUTH_SECURITY.md §11)
 *
 * 새 토큰을 만들기 전에 기존 토큰을 지운다 — 여러 개가 동시에 살아있으면
 * 하나만 무효화해도 다른 것으로 우회할 수 있다.
 */
export async function requestPasswordReset(
  input: RequestPasswordResetIntent,
): Promise<void> {
  const user = await findUserByEmail(input.email)
  if (user === null) {
    getLogger().info(
      { reason: 'unknown-email' },
      'password reset requested for unknown account',
    )
    return
  }

  const identifier = `${RESET_TOKEN_PREFIX}${user.email}`
  await deleteVerificationTokensFor(identifier)

  const token = createOneTimeToken()
  await createVerificationToken({
    identifier,
    token,
    expires: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  })

  try {
    await sendPasswordResetMail({
      to: user.email,
      token,
      locale: input.lang ?? (user.locale.startsWith('en') ? 'en' : 'ko'),
    })
  } catch (error: unknown) {
    getLogger().error(
      { err: error, userId: user.id },
      'password reset mail delivery failed',
    )
  }
}
