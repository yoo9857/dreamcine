'use client'

import { usePathname } from 'next/navigation'
import React, { type ReactNode } from 'react'

export function RouteTransition({
  children,
}: {
  readonly children: ReactNode
}): ReactNode {
  const pathname = usePathname()
  const isDiscoveryHome = pathname === '/' || pathname === '/browse'
  const isBrowseHome = pathname === '/browse'
  const isProfileShowcase = pathname.startsWith('/u/')
  const isWorkShowcase = pathname.startsWith('/series/')
  const isWorksGallery = pathname === '/works'
  const isCreatorsGallery = pathname === '/creators'
  const isWatchExperience = pathname.startsWith('/watch/')

  return (
    <div
      className={`aidream-route-view${isDiscoveryHome ? ' is-discovery-home' : ''}${isBrowseHome ? ' is-browse-home' : ''}${isProfileShowcase ? ' is-profile-showcase' : ''}${isWorkShowcase ? ' is-work-showcase' : ''}${isWorksGallery ? ' is-works-gallery' : ''}${isCreatorsGallery ? ' is-creators-gallery' : ''}${isWatchExperience ? ' is-watch-experience' : ''}`}
    >
      {children}
    </div>
  )
}
