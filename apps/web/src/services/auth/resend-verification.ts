import type { RequestPasswordResetInput } from '@aidream/core'
import {
  createVerificationToken,
  deleteVerificationTokensFor,
  findUserByEmail,
} from '@aidream/db'

import { getLogger } from '@/src/lib/logger'
import { mailTransportConfigured, sendVerificationMail } from '@/src/lib/mail'

import {
  createOneTimeToken,
  EMAIL_VERIFY_TTL_MS,
  VERIFY_TOKEN_PREFIX,
} from './signup'

export async function resendVerification(
  input: RequestPasswordResetInput,
): Promise<void> {
  const user = await findUserByEmail(input.email)
  if (user === null || user.emailVerified !== null) {
    getLogger().info(
      { reason: user === null ? 'unknown-email' : 'already-verified' },
      'verification resend skipped',
    )
    return
  }

  const identifier = `${VERIFY_TOKEN_PREFIX}${user.email}`
  await deleteVerificationTokensFor(identifier)
  const token = createOneTimeToken()
  await createVerificationToken({
    identifier,
    token,
    expires: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
  })

  if (!mailTransportConfigured()) {
    getLogger().error(
      { userId: user.id },
      'verification resend transport is not configured',
    )
    return
  }

  try {
    await sendVerificationMail({
      to: user.email,
      token,
      lang: user.locale.startsWith('en') ? 'en' : 'ko',
    })
  } catch (error: unknown) {
    getLogger().error(
      { err: error, userId: user.id },
      'verification resend delivery failed',
    )
  }
}
