import type { AdminUserQuery, Page, User, UserStatus } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

export interface ManageUsersService {
  list(session: RouteSession, query: AdminUserQuery): Promise<Page<User>>
  updateStatus(
    session: RouteSession,
    userId: string,
    status: UserStatus,
    reason: string,
  ): Promise<void>
}
