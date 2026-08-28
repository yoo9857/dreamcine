import { AppError } from '@aidream/core'
import {
  ACCOUNT_DELETION_CANCEL_TOKEN_PREFIX,
  createVerificationToken,
  deleteVerificationTokensFor,
  findUserById,
  requestAccountDeletion,
} from '@aidream/db'
import { enqueue, QUEUE } from '@aidream/queue'

import { verifyPassword } from '@/src/auth/password'
import { getLogger } from '@/src/lib/logger'
import {
  mailTransportConfigured,
  sendAccountDeletionCancelMail,
} from '@/src/lib/mail'

import { createOneTimeToken } from './signup'

const GRACE_MS = 30 * 24 * 60 * 60 * 1000

export interface DeleteAccountInput {
  readonly userId: string
  readonly confirmation: string
  readonly password?: string
  readonly reason?: string
  readonly now?: Date
}

export interface DeleteAccountDependencies {
  readonly findUser: typeof findUserById
  readonly verifyPassword: typeof verifyPassword
  readonly requestDeletion: typeof requestAccountDeletion
  readonly createRecoveryToken: typeof createVerificationToken
  readonly deleteRecoveryTokens: typeof deleteVerificationTokensFor
  readonly mailConfigured: typeof mailTransportConfigured
  readonly sendRecoveryMail: typeof sendAccountDeletionCancelMail
  readonly schedulePurge: (userId: string, delayMs: number) => Promise<void>
  readonly reportScheduleFailure: (error: unknown, userId: string) => void
}

const PRODUCTION_DEPENDENCIES: DeleteAccountDependencies = {
  findUser: findUserById,
  verifyPassword,
  requestDeletion: requestAccountDeletion,
  createRecoveryToken: createVerificationToken,
  deleteRecoveryTokens: deleteVerificationTokensFor,
  mailConfigured: mailTransportConfigured,
  sendRecoveryMail: sendAccountDeletionCancelMail,
  schedulePurge: (userId, delayMs) =>
    enqueue(
      QUEUE.ACCOUNT_PURGE,
      { userId },
      {
        jobId: `account-purge-${userId}`,
        delayMs,
        attempts: 12,
        backoff: { type: 'exponential', delay: 60_000 },
      },
    ),
  reportScheduleFailure: (error, userId) => {
    getLogger().error({ err: error, userId }, 'account purge enqueue failed')
  },
}

export async function deleteAccount(
  input: DeleteAccountInput,
  dependencies: DeleteAccountDependencies = PRODUCTION_DEPENDENCIES,
): Promise<{ scheduledPurgeAt: string }> {
  const user = await dependencies.findUser(input.userId)
  if (user === null) throw new AppError('E_USER_NOT_FOUND')
  if (input.confirmation !== user.handle) {
    throw new AppError('E_VALIDATION', { reason: 'handle-confirmation' })
  }
  if (user.passwordHash !== null) {
    const valid = await dependencies.verifyPassword(
      user.passwordHash,
      input.password ?? '',
    )
    if (!valid) throw new AppError('E_AUTH_INVALID_CREDENTIALS')
  }

  if (!dependencies.mailConfigured()) {
    getLogger().error(
      { userId: input.userId, reason: 'mail-transport-missing' },
      'account deletion blocked because recovery mail is unavailable',
    )
    throw new AppError('E_INTERNAL', { reason: 'mail-transport-missing' })
  }

  const now = input.now ?? new Date()
  const scheduledPurgeAt = new Date(now.getTime() + GRACE_MS)
  const recoveryIdentifier = `${ACCOUNT_DELETION_CANCEL_TOKEN_PREFIX}${input.userId}`
  const recoveryToken = createOneTimeToken()
  await dependencies.deleteRecoveryTokens(recoveryIdentifier)
  await dependencies.createRecoveryToken({
    identifier: recoveryIdentifier,
    token: recoveryToken,
    expires: scheduledPurgeAt,
  })

  try {
    await dependencies.sendRecoveryMail({
      to: user.email,
      token: recoveryToken,
      locale: user.locale.startsWith('en') ? 'en' : 'ko',
      purgeDate: new Intl.DateTimeFormat(
        user.locale.startsWith('en') ? 'en-US' : 'ko-KR',
        { dateStyle: 'long', timeZone: 'Asia/Seoul' },
      ).format(scheduledPurgeAt),
    })
  } catch (error: unknown) {
    await dependencies.deleteRecoveryTokens(recoveryIdentifier)
    throw error
  }

  let result: Awaited<ReturnType<typeof requestAccountDeletion>>
  try {
    result = await dependencies.requestDeletion({
      userId: input.userId,
      ...(input.reason === undefined ? {} : { reason: input.reason }),
      now,
    })
  } catch (error: unknown) {
    await dependencies.deleteRecoveryTokens(recoveryIdentifier)
    throw error
  }
  const delayMs = Math.max(0, result.scheduledPurgeAt.getTime() - now.getTime())
  try {
    await dependencies.schedulePurge(input.userId, delayMs || GRACE_MS)
  } catch (error: unknown) {
    // 일간 DB purge가 PENDING 요청을 다시 발견한다. 요청 자체를 되돌리면
    // 이미 철회 의사를 밝힌 계정과 콘텐츠가 재노출되므로 여기서는 성공을 유지한다.
    dependencies.reportScheduleFailure(error, input.userId)
  }
  return { scheduledPurgeAt: result.scheduledPurgeAt.toISOString() }
}
