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
  UploadCloud,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'

const NAVIGATION = [
  { href: '/studio', label: '대시보드', icon: Home },
  { href: '/studio#content', label: '콘텐츠', icon: Clapperboard },
  { href: '/studio#analytics', label: '분석', icon: BarChart3 },
  { href: '/studio/upload', label: '업로드', icon: UploadCloud },
  { href: '/studio/series/new', label: '새 시리즈', icon: Plus },
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
  const initial = displayName.trim().slice(0, 1).toUpperCase() || 'I'

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
            const active = !item.href.includes('#') && pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
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
