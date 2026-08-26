'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function RouteTransition({
  children,
}: {
  readonly children: ReactNode
}): ReactNode {
  const pathname = usePathname()
  const isDiscoveryHome = pathname === '/'

  return (
    <div
      key={pathname}
      className={`aidream-route-view${isDiscoveryHome ? ' is-discovery-home' : ''}`}
    >
      {children}
    </div>
  )
}
