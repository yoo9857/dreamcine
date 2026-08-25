import { AppError } from '@aidream/core'
import { findUserByHandle, unblockUser as deleteBlock } from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'

export interface UnblockUserDependencies {
  readonly findTarget: typeof findUserByHandle
  readonly unblock: typeof deleteBlock
}

export function unblockUser(
  session: RouteSession,
  handle: string,
  dependencies: UnblockUserDependencies = {
    findTarget: findUserByHandle,
    unblock: deleteBlock,
  },
): Promise<void> {
  return runUnblockUser(session, handle, dependencies)
}

async function runUnblockUser(
  session: RouteSession,
  handle: string,
  dependencies: UnblockUserDependencies,
): Promise<void> {
  const target = await dependencies.findTarget(handle)
  if (target === null) throw new AppError('E_USER_NOT_FOUND')
  if (target.id === session.userId) throw new AppError('E_USER_SELF_ACTION')
  await dependencies.unblock(session.userId, target.id)
}
