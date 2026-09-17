'use client'

import {
  BarChart3,
  ChevronLeft,
  CircleUserRound,
  Clapperboard,
  ExternalLink,
  Film,
  Home,
  Plus,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'

import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'

// 등록은 사이드바 항목이 아니라 상단의 단일 액션이다. 예전에는 "업로드" 와
// "새 시리즈" 가 여기 나란히 있었고, 둘이 한 작업의 앞뒤 단계라는 것이 드러나지
// 않아 크리에이터가 어디서 시작할지 헷갈렸다. 이제 진입점은 `/studio/new` 하나다.
const NAVIGATION = [
  { href: '/studio', label: '대시보드', icon: Home },
  { href: '/studio/content', label: '콘텐츠', icon: Clapperboard },
  { href: '/studio#analytics', label: '분석', icon: BarChart3 },
] as const

export function StudioShell({
  children,
  displayName,
  handle,
}: {
  readonly children: ReactNode
  readonly displayName: string
  readonly handle: string
}): ReactNode {
  const pathname = usePathname()
  const [activeHash, setActiveHash] = useState('')
  const initial = displayName.trim().slice(0, 1).toUpperCase() || 'I'

  useEffect(() => {
    let retryTimer: number | undefined
    let attempts = 0

    const syncHash = (): void => {
      const hash = window.location.hash
      setActiveHash(hash)
      if (pathname !== '/studio' || hash === '') return

      const target = document.getElementById(hash.slice(1))
      if (target !== null) {
        target.scrollIntoView({ block: 'start' })
        return
      }

      // The server-rendered dashboard can arrive after the shared studio shell.
      // Retry briefly so navigation from a nested studio route still lands on
      // the requested section instead of stopping at the top of the page.
      attempts += 1
      if (attempts < 30) retryTimer = window.setTimeout(syncHash, 100)
    }

    syncHash()
    window.addEventListener('hashchange', syncHash)
    window.addEventListener('popstate', syncHash)
    return () => {
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
      window.removeEventListener('hashchange', syncHash)
      window.removeEventListener('popstate', syncHash)
    }
  }, [pathname])

  const navigateToSection = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ): void => {
    if (pathname !== '/studio') return
    const hashStart = href.indexOf('#')
    if (hashStart < 0) return

    const hash = href.slice(hashStart)
    const target = document.getElementById(hash.slice(1))
    if (target === null) return

    event.preventDefault()
    if (window.location.hash !== hash) window.history.pushState(null, '', href)
    setActiveHash(hash)
    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    })
  }

  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <div className="studio-brand-row">
          <Link href="/studio" aria-label="ILOG Studio 홈">
            <LeftBrandLogo priority />
          </Link>
          <span>STUDIO</span>
        </div>

        <nav className="studio-nav" aria-label="스튜디오 메뉴">
          {NAVIGATION.map((item) => {
            const hashStart = item.href.indexOf('#')
            const itemHash = hashStart < 0 ? '' : item.href.slice(hashStart)
            const active =
              itemHash === ''
                ? item.href === '/studio'
                  ? pathname === '/studio' && activeHash === ''
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`) ||
                    (item.href === '/studio/content' &&
                      pathname.startsWith('/studio/series/'))
                : pathname === '/studio' && activeHash === itemHash
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={(event) => {
                  navigateToSection(event, item.href)
                }}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="studio-side-divider" />
        <nav className="studio-nav studio-nav-secondary" aria-label="계정 메뉴">
          <Link href={`/u/${handle}`}>
            <CircleUserRound aria-hidden="true" />
            <span>채널 보기</span>
            <ExternalLink aria-hidden="true" />
          </Link>
          <Link href="/account#profile">
            <Settings aria-hidden="true" />
            <span>프로필 설정</span>
          </Link>
        </nav>

        <Link href="/" className="studio-exit-link">
          <ChevronLeft aria-hidden="true" />
          ILOG로 돌아가기
        </Link>
      </aside>

      <div className="studio-workspace">
        <header className="studio-topbar">
          <div>
            <Film aria-hidden="true" />
            <span>Creator Workspace</span>
          </div>
          <Link href="/studio/new" className="studio-topbar-create">
            <Plus aria-hidden="true" />
            <span>만들기</span>
          </Link>
          <Link href={`/u/${handle}`} className="studio-identity">
            <span className="studio-avatar" aria-hidden="true">
              {initial}
            </span>
            <span>
              <strong>{displayName}</strong>
              <small>@{handle}</small>
            </span>
          </Link>
        </header>
        <div className="studio-page">{children}</div>
      </div>
    </div>
  )
}
