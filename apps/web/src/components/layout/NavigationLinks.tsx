'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

type NavIconName =
  | 'home'
  | 'works'
  | 'creators'
  | 'events'
  | 'notifications'
  | 'studio'

interface NavigationLinksProps {
  readonly authenticated: boolean
  readonly creatorRegistered?: boolean
  readonly mobile?: boolean
}

interface NavigationItem {
  readonly href: string
  readonly label: string
  readonly icon: NavIconName
}

function NavIcon({ name }: { readonly name: NavIconName }): ReactNode {
  if (name === 'home') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />
      </svg>
    )
  }
  if (name === 'works') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m10 9 5 3-5 3Z" />
      </svg>
    )
  }
  if (name === 'creators') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="4" />
        <path d="M2.5 21a6.5 6.5 0 0 1 13 0M17 8.5a3.5 3.5 0 0 1 0 7M17.5 18a5 5 0 0 1 4 3" />
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
  if (name === 'events') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16M8 14h3M13 14h3M8 17h3" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8.5 12 4l8 4.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
      <path d="M9 20v-6h6v6M8 9h8" />
    </svg>
  )
}

function matchesPath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isItemActive(pathname: string, item: NavigationItem): boolean {
  if (matchesPath(pathname, item.href)) return true
  if (item.icon === 'works') {
    return ['/series', '/watch'].some((route) => matchesPath(pathname, route))
  }
  if (item.icon === 'creators') return matchesPath(pathname, '/u')
  return false
}

export function NavigationLinks({
  authenticated,
  creatorRegistered = false,
  mobile = false,
}: NavigationLinksProps): ReactNode {
  const pathname = usePathname()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  const items: readonly NavigationItem[] = [
    { href: authenticated ? '/browse' : '/', label: '홈', icon: 'home' },
    { href: '/works', label: '작품', icon: 'works' },
    { href: '/creators', label: '작가', icon: 'creators' },
    { href: '/events', label: '이벤트', icon: 'events' },
    ...(authenticated
      ? ([
          {
            href: '/notifications',
            label: '알람',
            icon: 'notifications',
          },
        ] as const)
      : []),
    {
      href: creatorRegistered ? '/studio' : '/creator-apply',
      label: '스튜디오',
      icon: 'studio',
    },
  ]

  const activeIndex = items.findIndex((item) => isItemActive(pathname, item))
  const railStyle = {
    '--rail-index': String(Math.max(activeIndex, 0)),
    '--nav-count': String(items.length),
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
        const active = isItemActive(pathname, item)
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
