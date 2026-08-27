import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import { listNotifications } from './list-notifications'
import { markNotificationsRead } from './mark-notifications-read'

const session = {
  userId: 'viewer',
  user: {
    id: 'viewer',
    handle: 'viewer',
    email: 'v@example.com',
    displayName: 'V',
    role: 'VIEWER',
    status: 'ACTIVE',
    emailVerified: true,
    tier: 'BRONZE',
    isVerified: false,
  },
  expiresAt: new Date(),
} satisfies RouteSession

describe('notification queries', () => {
  it('scopes listing and reading to the authenticated user', async () => {
    const list = vi.fn().mockResolvedValue({ items: [], nextCursor: null })
    await listNotifications(session, { limit: 20, cursor: 'cursor' }, list)
    expect(list).toHaveBeenCalledWith({
      userId: 'viewer',
      limit: 20,
      cursor: 'cursor',
    })

    const mark = vi.fn().mockResolvedValue(2)
    await expect(
      markNotificationsRead(session, { ids: ['a', 'b'] }, mark),
    ).resolves.toEqual({ updated: 2 })
    expect(mark).toHaveBeenCalledWith('viewer', ['a', 'b'])
  })
})
