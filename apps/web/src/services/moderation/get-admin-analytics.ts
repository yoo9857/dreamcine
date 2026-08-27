import { AppError, can } from '@aidream/core'
import {
  getAdminAnalyticsSnapshot,
  type AdminAnalyticsSnapshot,
} from '@aidream/db'

import type { RouteSession } from '@/src/auth/types'

export function getAdminAnalytics(
  session: RouteSession,
): Promise<AdminAnalyticsSnapshot> {
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
  return getAdminAnalyticsSnapshot()
}
