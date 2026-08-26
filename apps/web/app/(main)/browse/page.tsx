import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { AuthenticatedDiscoveryHome } from '@/src/components/discovery/AuthenticatedDiscoveryHome'

export default async function BrowsePage(): Promise<ReactNode> {
  const session = await getServerSession()

  if (session === null) {
    redirect('/login?next=%2Fbrowse')
  }

  return <AuthenticatedDiscoveryHome session={session} />
}
