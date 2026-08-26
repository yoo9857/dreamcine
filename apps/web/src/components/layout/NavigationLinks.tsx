'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

type NavIconName = 'home' | 'following' | 'search' | 'notifications' | 'studio'

interface NavigationLinksProps {
  readonly authenticated: boolean
  readonly mobile?: boolean
}

interface NavigationItem {
  readonly href: string
  readonly label: string
  readonly icon: NavIconName
}

const primaryItems: readonly NavigationItem[] = [
  { href: '/', label: '인기', icon: 'home' },
  { href: '/following', label: '팔로잉', icon: 'following' },
  { href: '/search', label: '검색', icon: 'search' },
]

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

function matchesPath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavigationLinks({
  authenticated,
  mobile = false,
}: NavigationLinksProps): ReactNode {
  const pathname = usePathname()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  const items: readonly NavigationItem[] = mobile
    ? [
        ...primaryItems,
        {
          href: authenticated ? '/studio' : '/login',
          label: authenticated ? '업로드' : '로그인',
          icon: 'studio',
        },
      ]
    : [
        ...primaryItems,
        ...(authenticated
          ? ([
              {
                href: '/notifications',
                label: '알림',
                icon: 'notifications',
              },
            ] as const)
          : []),
        { href: '/studio', label: '스튜디오', icon: 'studio' },
      ]

  const activeIndex = items.findIndex((item) =>
    matchesPath(pathname, item.href),
  )
  const railStyle = {
    '--rail-index': String(Math.max(activeIndex, 0)),
  } as CSSProperties

  return (
    <nav
      className={mobile ? 'aidream-mobile-nav' : 'aidream-rail-links'}
      aria-label={mobile ? '모바일 주요 메뉴' : '주요 메뉴'}
      data-has-active={activeIndex >= 0 ? 'true' : 'false'}
      style={railStyle}
    >
      {mobile ? null : (
        <i className="aidream-rail-indicator" aria-hidden="true" />
      )}
      {items.map((item) => {
        const active = matchesPath(pathname, item.href)
        const pending = pendingHref === item.href
        return (
          <Link
            href={item.href}
            key={item.href}
            className={`${active ? 'is-active' : ''} ${pending ? 'is-destination' : ''}`.trim()}
            aria-current={active ? 'page' : undefined}
            aria-label={item.label}
            data-label={item.label}
            onClick={() => {
              if (!active) setPendingHref(item.href)
            }}
          >
            <NavIcon name={item.icon} />
            {mobile ? <span>{item.label}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}
