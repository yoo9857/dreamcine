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
  // 작가·작품 페이지는 같은 어두운 셸(상단 바 + 레일)을 쓴다.
  const isProfileShowcase =
    pathname.startsWith('/u/') || pathname.startsWith('/series/')
  const isWorksGallery = pathname === '/works'
  const isCreatorsGallery = pathname === '/creators'
  const isWatchExperience = pathname.startsWith('/watch/')
  // 메시지함·공지사항은 작가 페이지와 같은 틀을 쓴다. 상단 바가 로그인 버튼을
  // 가지므로 떠 있는 로그인 버튼을 숨겨야 겹치지 않는다.
  const isMessages =
    pathname === '/messages' ||
    pathname.startsWith('/messages/') ||
    pathname === '/notices'

  return (
    <div
      className={`aidream-route-view${isDiscoveryHome ? ' is-discovery-home' : ''}${isBrowseHome ? ' is-browse-home' : ''}${isProfileShowcase || isMessages ? ' is-profile-showcase' : ''}${isWorksGallery ? ' is-works-gallery' : ''}${isCreatorsGallery ? ' is-creators-gallery' : ''}${isWatchExperience ? ' is-watch-experience' : ''}`}
    >
      {children}
    </div>
  )
}
