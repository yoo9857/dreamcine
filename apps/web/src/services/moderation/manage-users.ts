import {
  AppError,
  can,
  type AdminUserQuery,
  type Page,
  type User,
  type UserStatus,
} from '@aidream/core'
import { listUsersForAdmin } from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'

import { suspendUser } from './suspend-user'

export interface ManageUsersService {
  list(session: RouteSession, query: AdminUserQuery): Promise<Page<User>>
  updateStatus(
    session: RouteSession,
    userId: string,
    status: UserStatus,
    reason: string,
  ): Promise<void>
}

function assertAdmin(session: RouteSession): void {
  if (
    !can(
      {
        id: session.userId,
        role: session.user.role,
        status: session.user.status,
        emailVerified: session.user.emailVerified,
      },
      'user.suspend',
    )
  ) {
    throw new AppError('E_PERM_DENIED')
  }
}

export function listAdminUsers(
  session: RouteSession,
  query: AdminUserQuery,
): Promise<Page<User>> {
  assertAdmin(session)
  return listUsersForAdmin({
    limit: query.limit,
    ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
    ...(query.query === undefined ? {} : { query: query.query }),
  })
}

export function updateAdminUserStatus(
  session: RouteSession,
  userId: string,
  status: UserStatus,
  reason: string,
): Promise<void> {
  assertAdmin(session)
  return suspendUser(session, userId, status, reason)
}
