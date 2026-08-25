import type { ReactNode } from 'react'

import type { RouteSession } from '@/src/auth/types'
import { MainNav } from './MainNav'

export function AppShell({
  children,
  session,
}: {
  readonly children: ReactNode
  readonly session: RouteSession | null
}): ReactNode {
  return (
    <div className="min-h-dvh bg-bg pb-16 sm:pb-0">
      <MainNav session={session} />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">{children}</main>
    </div>
  )
}
