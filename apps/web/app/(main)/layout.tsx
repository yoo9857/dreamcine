import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { AppShell } from '@/src/components/layout/AppShell'

export const dynamic = 'force-dynamic'

export default async function MainLayout({
  children,
}: {
  readonly children: ReactNode
}): Promise<ReactNode> {
  const session = await getServerSession()
  return <AppShell session={session}>{children}</AppShell>
}
