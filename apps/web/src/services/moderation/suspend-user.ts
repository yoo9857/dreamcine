import {
  AppError,
  can,
  UpdateUserStatusSchema,
  type UpdateUserStatusInput,
} from '@aidream/core'
import { applyUserSanction, type SuspensionDays } from '@aidream/db'
import type { RouteSession } from '@/src/auth/types'
export interface SuspendUserDependencies {
  apply: typeof applyUserSanction
}
export async function suspendUser(
  session: RouteSession,
  userId: string,
  status: UpdateUserStatusInput['status'],
  reason: string,
  durationDays?: SuspensionDays,
  dependencies: SuspendUserDependencies = { apply: applyUserSanction },
): Promise<void> {
  if (!can({ ...session.user, id: session.userId }, 'user.suspend'))
    throw new AppError('E_PERM_DENIED')
  if (userId === session.userId) throw new AppError('E_USER_SELF_ACTION')
  const parsed = UpdateUserStatusSchema.safeParse({
    status,
    reason,
    ...(durationDays === undefined ? {} : { durationDays }),
  })
  if (!parsed.success) throw new AppError('E_VALIDATION')
  await dependencies.apply({
    actorId: session.userId,
    userId,
    status: parsed.data.status,
    reason: parsed.data.reason,
    ...(parsed.data.durationDays === undefined
      ? {}
      : { durationDays: parsed.data.durationDays }),
  })
}
