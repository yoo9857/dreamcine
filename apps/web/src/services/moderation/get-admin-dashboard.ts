import { AppError, can } from '@aidream/core'
import {
  getAdminDashboardSnapshot,
  type AdminDashboardSnapshot,
} from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'

export function getAdminDashboard(
  session: RouteSession,
  periodDays = 7,
): Promise<AdminDashboardSnapshot> {
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
  return getAdminDashboardSnapshot(new Date(), periodDays)
}
