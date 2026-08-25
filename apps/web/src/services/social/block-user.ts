import { AppError } from '@aidream/core'
import { blockUser as insertBlock, findUserByHandle } from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'

export interface BlockUserDependencies {
  readonly findTarget: typeof findUserByHandle
  readonly block: typeof insertBlock
}

export function blockUser(
  session: RouteSession,
  handle: string,
  dependencies: BlockUserDependencies = {
    findTarget: findUserByHandle,
    block: insertBlock,
  },
): Promise<void> {
  return runBlockUser(session, handle, dependencies)
}

async function runBlockUser(
  session: RouteSession,
  handle: string,
  dependencies: BlockUserDependencies,
): Promise<void> {
  const target = await dependencies.findTarget(handle)
  if (target === null) throw new AppError('E_USER_NOT_FOUND')
  if (target.id === session.userId) throw new AppError('E_USER_SELF_ACTION')
  await dependencies.block(session.userId, target.id)
}
