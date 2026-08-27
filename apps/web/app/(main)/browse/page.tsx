import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import type { RouteSession } from '@/src/auth/types'
import { AuthenticatedDiscoveryHome } from '@/src/components/discovery/AuthenticatedDiscoveryHome'

const developmentPreviewSession: RouteSession = {
  userId: 'preview-user',
  user: {
    id: 'preview-user',
    handle: 'hanbin',
    email: 'preview@ilog.local',
    displayName: '한빈',
    role: 'CREATOR',
    status: 'ACTIVE',
    emailVerified: true,
  },
  expiresAt: new Date('2099-12-31T23:59:59.000Z'),
}

export default async function BrowsePage(): Promise<ReactNode> {
  const session = await getServerSession()

  if (session === null) {
    if (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL) {
      return <AuthenticatedDiscoveryHome session={developmentPreviewSession} />
    }
    redirect('/login?next=%2Fbrowse')
  }

  return <AuthenticatedDiscoveryHome session={session} />
}
