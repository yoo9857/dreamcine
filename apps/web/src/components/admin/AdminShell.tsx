'use client'

import {
  ChartNoAxesCombined,
  Bell,
  ChevronLeft,
  CircleHelp,
  ClipboardCheck,
  Clapperboard,
  ExternalLink,
  Film,
  Flag,
  HardDrive,
  History,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

interface AdminShellProps {
  readonly children: ReactNode
  readonly previewMode?: boolean
  readonly user: {
    readonly displayName: string
    readonly email: string
    readonly role: string
  }
}

const navigation = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard, exact: true },
  { href: '/admin/analytics', label: '영상 분석', icon: ChartNoAxesCombined },
  { href: '/admin/users', label: '회원 관리', icon: Users },
  { href: '/admin/applications', label: '지원서 심사', icon: ClipboardCheck },
  { href: '/admin/content', label: '콘텐츠 관리', icon: Film },
  { href: '/admin/assets', label: '영상 에셋', icon: HardDrive },
  { href: '/admin/reports', label: '신고 센터', icon: Flag },
  { href: '/admin/audit', label: '권한 감사', icon: History },
] as const

const previewRoutes = new Set(['/admin', '/admin/analytics', '/admin/users'])

export function AdminShell({
  children,
  previewMode = false,
  user,
}: AdminShellProps) {
  const pathname = usePathname()
  const isAdmin = user.role === 'ADMIN'
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const initials = user.displayName.trim().slice(0, 2).toUpperCase() || 'AD'
  const adminHref = (href: string): string => {
    if (!previewMode) return href
    if (!previewRoutes.has(href)) return '/admin-preview'
    return href.replace(/^\/admin/, '/admin-preview')
  }

  useEffect(() => {
    function focusSearch(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => {
      window.removeEventListener('keydown', focusSearch)
    }
  }, [])

  return (
    <div
      className={`admin-shell${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-mobile-open' : ''}`}
    >
      <button
        className="admin-mobile-backdrop"
        type="button"
        aria-label="메뉴 닫기"
        onClick={() => {
          setMobileOpen(false)
        }}
      />
      <aside className="admin-sidebar">
        <div className="admin-brand-row">
          <Link
            className="admin-brand"
            href={adminHref(isAdmin ? '/admin' : '/admin/reports')}
            aria-label="ilog 관리자 홈"
          >
            <span className="admin-brand-mark">i</span>
            <span className="admin-brand-copy">
              <strong>ilog</strong>
              <small>CONTROL ROOM</small>
            </span>
          </Link>
          <button
            className="admin-icon-button admin-mobile-close"
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => {
              setMobileOpen(false)
            }}
          >
            <X />
          </button>
        </div>

        <nav className="admin-navigation" aria-label="관리자 메뉴">
          <p className="admin-nav-label">WORKSPACE</p>
          {navigation
            .filter((item) => isAdmin || item.href === '/admin/reports')
            .map((item) => {
              const href = adminHref(item.href)
              const active =
                item.href === '/admin'
                  ? pathname === href
                  : pathname.startsWith(href)
              const Icon = item.icon
              if (previewMode && !previewRoutes.has(item.href)) {
                return (
                  <span
                    key={item.href}
                    className="is-preview-disabled"
                    title="이 메뉴는 운영 관리자 화면에서 확인할 수 있습니다."
                    aria-disabled="true"
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </span>
                )
              }
              return (
                <Link
                  key={item.href}
                  className={active ? 'is-active' : undefined}
                  href={href}
                  title={collapsed ? item.label : undefined}
                  onClick={() => {
                    setMobileOpen(false)
                  }}
                >
                  <Icon />
                  <span>{item.label}</span>
                  {item.href === '/admin/reports' ? (
                    <i className="admin-nav-pulse" aria-hidden="true" />
                  ) : null}
                </Link>
              )
            })}

          <p className="admin-nav-label admin-nav-label-secondary">SHORTCUTS</p>
          <Link
            href="/studio"
            title={collapsed ? '크리에이터 스튜디오' : undefined}
          >
            <Clapperboard />
            <span>크리에이터 스튜디오</span>
            <ExternalLink className="admin-nav-external" />
          </Link>
          <Link
            href="/browse"
            title={collapsed ? '서비스로 돌아가기' : undefined}
          >
            <ChevronLeft />
            <span>서비스로 돌아가기</span>
          </Link>
        </nav>

        <div className="admin-sidebar-callout">
          <span>
            <Sparkles />
          </span>
          <strong>운영 인사이트</strong>
          <p>신고와 콘텐츠 상태를 매일 확인해 주세요.</p>
          <Link href={adminHref('/admin/reports')}>검토 시작하기</Link>
        </div>

        <div className="admin-profile">
          <span className="admin-avatar">{initials}</span>
          <span className="admin-profile-copy">
            <strong>{user.displayName}</strong>
            <small>{user.role}</small>
          </span>
          <ShieldCheck />
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar-start">
            <button
              className="admin-icon-button admin-mobile-menu"
              type="button"
              aria-label="메뉴 열기"
              onClick={() => {
                setMobileOpen(true)
              }}
            >
              <Menu />
            </button>
            <button
              className="admin-icon-button admin-desktop-menu"
              type="button"
              aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
              onClick={() => {
                setCollapsed((value) => !value)
              }}
            >
              <PanelLeftClose />
            </button>
            <span className="admin-topbar-start-divider" />
            {isAdmin ? (
              <form
                className="admin-global-search"
                action={adminHref('/admin/users')}
              >
                <Search />
                <input
                  ref={searchRef}
                  name="q"
                  type="search"
                  aria-label="회원 검색"
                  placeholder="회원, 이메일 검색..."
                />
                <kbd>⌘ K</kbd>
              </form>
            ) : null}
          </div>
          <div className="admin-topbar-actions">
            <Link
              className="admin-icon-button"
              href={adminHref('/admin/reports')}
              aria-label="알림"
            >
              <Bell />
              <i aria-hidden="true" />
            </Link>
            <Link
              className="admin-icon-button"
              href="/terms"
              aria-label="도움말"
            >
              <CircleHelp />
            </Link>
            <span className="admin-topbar-divider" />
            <div className="admin-topbar-user">
              <span className="admin-avatar">{initials}</span>
              <span>
                <strong>{user.displayName}</strong>
                <small>{user.email}</small>
              </span>
            </div>
          </div>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  )
}
