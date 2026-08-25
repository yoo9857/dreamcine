import type { ReactNode } from 'react'

import { AppShell } from '@/src/components/layout/AppShell'

export const dynamic = 'force-dynamic'

export default function MainLayout({
  children,
}: {
  readonly children: ReactNode
}): ReactNode {
  return <AppShell>{children}</AppShell>
}
