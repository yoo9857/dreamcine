import { Button } from '@aidream/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'

import type { RouteSession } from '@/src/auth/types'

type NavIconName = 'home' | 'following' | 'search' | 'notifications' | 'studio'

function NavIcon({ name }: { readonly name: NavIconName }): ReactNode {
  if (name === 'home') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />
      </svg>
    )
  }
  if (name === 'following') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="4" />
        <path d="M2.5 21a6.5 6.5 0 0 1 13 0M18 8v6M15 11h6" />
      </svg>
    )
  }
  if (name === 'search') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </svg>
    )
  }
  if (name === 'notifications') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m10 9 5 3-5 3Z" />
    </svg>
  )
}

const primaryItems = [
  { href: '/', label: '인기', icon: 'home' },
  { href: '/following', label: '팔로잉', icon: 'following' },
  { href: '/search', label: '검색', icon: 'search' },
] as const

export function MainNav({
  session,
}: {
  readonly session: RouteSession | null
}): ReactNode {
  return (
    <>
      <aside className="aidream-rail" aria-label="주요 메뉴">
        <Link href="/" className="aidream-rail-brand" aria-label="ilog 홈">
          <span aria-hidden="true" />
        </Link>
        <nav className="aidream-rail-links">
          {primaryItems.map((item, index) => (
            <Link
              href={item.href}
              key={item.href}
              className={index === 0 ? 'is-active' : undefined}
              aria-label={item.label}
              data-label={item.label}
            >
              <NavIcon name={item.icon} />
            </Link>
          ))}
          {session === null ? null : (
            <Link href="/notifications" aria-label="알림" data-label="알림">
              <NavIcon name="notifications" />
            </Link>
          )}
          <Link href="/studio" aria-label="스튜디오" data-label="스튜디오">
            <NavIcon name="studio" />
          </Link>
        </nav>
      </aside>

      <div className="aidream-session-actions">
        {session === null ? (
          <>
            <Button asChild size="sm" variant="secondary">
              <Link href="/signup">회원가입</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">로그인</Link>
            </Button>
          </>
        ) : (
          <Button asChild size="sm">
            <Link href="/studio">업로드</Link>
          </Button>
        )}
      </div>

      <nav className="aidream-mobile-nav" aria-label="모바일 주요 메뉴">
        {primaryItems.map((item) => (
          <Link href={item.href} key={item.href}>
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
        <Link href={session === null ? '/login' : '/studio'}>
          <NavIcon name="studio" />
          <span>{session === null ? '로그인' : '업로드'}</span>
        </Link>
      </nav>
    </>
  )
}
