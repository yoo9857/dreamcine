'use client'

import { usePathname } from 'next/navigation'
import React, { type ReactNode } from 'react'

export function RouteTransition({
  children,
}: {
  readonly children: ReactNode
}): ReactNode {
  const pathname = usePathname()
  const isDiscoveryHome = pathname === '/'

  return (
    <div
      className={`aidream-route-view${isDiscoveryHome ? ' is-discovery-home' : ''}`}
    >
      {children}
    </div>
  )
}
