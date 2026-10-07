'use client'

import { Button } from '@aidream/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

/** Pages with their own top bar render their own session controls. */
export function GuestSessionActions() {
  const pathname = usePathname()
  const hasTopbar =
    ['/browse', '/works', '/creators', '/messages', '/notices', '/events'].some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    ) ||
    ['/u/', '/series/', '/watch/'].some((route) => pathname.startsWith(route))

  if (hasTopbar) return null

  return (
    <div className="aidream-session-actions">
      <Button asChild size="sm" variant="secondary">
        <Link href="/signup">회원가입</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/login">로그인</Link>
      </Button>
    </div>
  )
}
