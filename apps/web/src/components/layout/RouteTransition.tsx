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
  const isProfileShowcase = pathname.startsWith('/u/')
  const isWorkShowcase = pathname.startsWith('/series/')

  return (
    <div
      className={`aidream-route-view${isDiscoveryHome ? ' is-discovery-home' : ''}${isProfileShowcase ? ' is-profile-showcase' : ''}${isWorkShowcase ? ' is-work-showcase' : ''}`}
    >
      {children}
    </div>
  )
}
