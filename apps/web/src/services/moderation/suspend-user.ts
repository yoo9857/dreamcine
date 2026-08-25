import { AppError, can, type UserStatus } from '@aidream/core'
import { findUserById, setUserModerationStatus } from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'
import { getLogger } from '@/src/lib/logger'
import { notify } from '@/src/services/notification/notify'

export interface SuspendUserDependencies {
  findUser: typeof findUserById
  setStatus: typeof setUserModerationStatus
  notify: typeof notify
}

export function suspendUser(
  session: RouteSession,
  userId: string,
  status: UserStatus,
  reason: string,
  dependencies: SuspendUserDependencies = productionDependencies(),
): Promise<void> {
  return runSuspendUser(session, userId, status, reason, dependencies)
}

async function runSuspendUser(
  session: RouteSession,
  userId: string,
  status: UserStatus,
  reason: string,
  dependencies: SuspendUserDependencies,
): Promise<void> {
  const actor = {
    id: session.userId,
    role: session.user.role,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
  }
  if (!can(actor, 'user.suspend')) throw new AppError('E_PERM_DENIED')
  if (userId === session.userId) throw new AppError('E_USER_SELF_ACTION')
  if (status !== 'ACTIVE' && status !== 'SUSPENDED')
    throw new AppError('E_VALIDATION', { field: 'status' })

  const user = await dependencies.findUser(userId)
  if (user === null) throw new AppError('E_USER_NOT_FOUND')
  await dependencies.setStatus(userId, status)

  try {
    await dependencies.notify({
      type: 'MODERATION',
      to: userId,
      targetType: 'USER',
      targetId: userId,
      action: status,
    })
  } catch (error: unknown) {
    getLogger().error(
      { err: error, moderatorId: session.userId, userId, status },
      'moderation user notification failed',
    )
  }
  getLogger().info(
    { moderatorId: session.userId, userId, status, reason },
    'user moderation status changed',
  )
}

function productionDependencies(): SuspendUserDependencies {
  return { findUser: findUserById, setStatus: setUserModerationStatus, notify }
}
