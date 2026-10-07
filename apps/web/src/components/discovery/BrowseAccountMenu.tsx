'use client'

import {
  can,
  type MemberTier,
  type UserRole,
  type UserStatus,
} from '@aidream/core'
import { TierBadge } from '@aidream/ui'
import {
  Award,
  BadgeCheck,
  CircleHelp,
  LogOut,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import React, {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  TIER_LADDER_ROWS,
  TIER_PAGE_HREF,
  formatPoints,
} from '@/src/content/member-tier-guide'

interface BrowseAccountMenuProps {
  readonly user: {
    readonly id: string
    readonly handle: string
    readonly displayName: string
    readonly email: string
    readonly role: UserRole
    readonly status: UserStatus
    readonly emailVerified: boolean
    readonly tier: MemberTier
    readonly isVerified: boolean
  }
}

export function BrowseAccountMenu({ user }: BrowseAccountMenuProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [tierHelpOpen, setTierHelpOpen] = useState(false)
  const tierHelpId = useId()
  const tierHelpRef = useRef<HTMLButtonElement>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) setTierHelpOpen(false)
  }, [open])

  useEffect(() => {
    if (!open) return

    const closeFromOutside = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeFromKeyboard = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      // 등급 안내가 펼쳐져 있으면 안내만 닫는다. 메뉴는 한 번 더 누를 때 닫힌다.
      if (tierHelpOpen) {
        setTierHelpOpen(false)
        tierHelpRef.current?.focus()
        return
      }
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeFromOutside)
    document.addEventListener('keydown', closeFromKeyboard)
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside)
      document.removeEventListener('keydown', closeFromKeyboard)
    }
  }, [open, tierHelpOpen])

  async function logout(): Promise<void> {
    if (signingOut) return
    setSigningOut(true)
    setSignOutError(null)
    try {
      // Auth.js가 반환하는 절대 URL은 사용하지 않는다. 브라우저의 현재 origin에서
      // 상대 경로로 이동해 프록시 내부 주소(0.0.0.0)가 노출될 여지를 없앤다.
      await signOut({ redirect: false, redirectTo: '/' })
      router.replace('/')
      router.refresh()
    } catch {
      setSigningOut(false)
      setSignOutError('로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  function focusMenuEdge(edge: 'first' | 'last'): void {
    requestAnimationFrame(() => {
      const items = menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])',
      )
      if (items === undefined || items.length === 0) return
      items[edge === 'first' ? 0 : items.length - 1]?.focus()
    })
  }

  function navigateMenu(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])',
      ),
    )
    if (items.length === 0) return
    event.preventDefault()
    if (event.key === 'Home') {
      items[0]?.focus()
      return
    }
    if (event.key === 'End') {
      items.at(-1)?.focus()
      return
    }
    const current = items.indexOf(document.activeElement as HTMLElement)
    const delta = event.key === 'ArrowDown' ? 1 : -1
    const next =
      current < 0 ? 0 : (current + delta + items.length) % items.length
    items[next]?.focus()
  }

  const initial = user.displayName.trim().slice(0, 1).toLocaleUpperCase()
  const hasAdminAccess = can(
    {
      id: user.id,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
    },
    'report.review',
  )
  const statusLabel = user.status === 'ACTIVE' ? 'ACTIVE' : user.status

  return (
    <div className="browse-account" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="browse-account-trigger"
        aria-label={`${user.displayName} 계정 메뉴`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="browse-account-menu"
        onClick={() => {
          setOpen((current) => !current)
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          event.preventDefault()
          setOpen(true)
          focusMenuEdge(event.key === 'ArrowDown' ? 'first' : 'last')
        }}
      >
        <span className="browse-character" aria-hidden="true">
          <span>{initial || '?'}</span>
          <i />
        </span>
        <span className="browse-account-trigger-copy">
          <strong>
            {user.displayName}
            {/* 트리거는 폭이 좁다. 라벨 대신 점만 두고 등급 이름은
                aria-label·title 로 남긴다. */}
            <TierBadge tier={user.tier} compact />
          </strong>
          <small>@{user.handle}</small>
        </span>
        <span className="browse-account-chevron" aria-hidden="true" />
      </button>

      {open ? (
        <div
          id="browse-account-menu"
          ref={menuRef}
          className="browse-account-popover"
          role="menu"
          aria-label="계정 바로가기"
          onKeyDown={navigateMenu}
        >
          <header>
            <span className="browse-character is-large" aria-hidden="true">
              <span>{initial || '?'}</span>
              <i />
            </span>
            <div>
              <p>
                {user.displayName}
                {user.isVerified ? (
                  <BadgeCheck
                    className="browse-account-verified"
                    role="img"
                    aria-label="인증 채널"
                  />
                ) : null}
              </p>
              <span>@{user.handle}</span>
              <small>{user.email}</small>
            </div>
            <span className="browse-account-status">
              <i aria-hidden="true" /> {statusLabel}
            </span>
          </header>

          <div className="browse-account-membership">
            <div>
              <small>ILOG MEMBERSHIP</small>
              <strong>
                나의 크리에이터 등급
                <button
                  ref={tierHelpRef}
                  type="button"
                  role="menuitem"
                  className="browse-account-tier-help"
                  aria-label="크리에이터 등급 설명"
                  aria-expanded={tierHelpOpen}
                  aria-controls={tierHelpId}
                  onClick={() => {
                    setTierHelpOpen((current) => !current)
                  }}
                >
                  ?
                </button>
              </strong>
            </div>
            {user.tier === 'BRONZE' ? (
              <span className="browse-account-base-tier">
                <i aria-hidden="true" /> BRONZE
              </span>
            ) : (
              <TierBadge tier={user.tier} size="sm" />
            )}
          </div>

          {tierHelpOpen ? (
            <div
              id={tierHelpId}
              className="browse-account-tier-guide"
              role="note"
              aria-label="크리에이터 등급 안내"
            >
              <p>
                팔로워·공개 회차·조회·시청·댓글·좋아요·가입 기간을 합산한 활동
                점수로 등급이 정해져요. 크리에이터는 등급이 높을수록 업로드
                한도가 늘어나고, 등급은 정기 평가로 바뀝니다.
              </p>
              <ol>
                {TIER_LADDER_ROWS.map((row) => (
                  <li
                    key={row.tier}
                    data-tier={row.tier}
                    aria-current={row.tier === user.tier ? 'true' : undefined}
                  >
                    <span>
                      <i aria-hidden="true" />
                      {row.tier}
                    </span>
                    <small>{formatPoints(row.minPoints)}점~</small>
                  </li>
                ))}
              </ol>
              <Link
                href={TIER_PAGE_HREF}
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                }}
              >
                내 점수와 등급 자세히 보기 →
              </Link>
            </div>
          ) : null}

          <div className="browse-account-links">
            <p className="browse-account-section-label">
              PROFILE &amp; ACCOUNT
            </p>
            <Link
              href={`/u/${encodeURIComponent(user.handle)}`}
              role="menuitem"
              onClick={() => {
                setOpen(false)
              }}
            >
              <UserRound aria-hidden="true" />
              <span>
                <strong>내 프로필</strong>
                <small>공개 프로필 확인</small>
              </span>
              <b aria-hidden="true">↗</b>
            </Link>
            <Link
              href={TIER_PAGE_HREF}
              role="menuitem"
              onClick={() => {
                setOpen(false)
              }}
            >
              <Award aria-hidden="true" />
              <span>
                <strong>내 등급</strong>
                <small>활동 점수와 등급 혜택</small>
              </span>
              <b aria-hidden="true">→</b>
            </Link>
            <Link
              href="/account#profile"
              role="menuitem"
              onClick={() => {
                setOpen(false)
              }}
            >
              <SlidersHorizontal aria-hidden="true" />
              <span>
                <strong>프로필 관리</strong>
                <small>이름과 소개 편집</small>
              </span>
              <b aria-hidden="true">→</b>
            </Link>
            <Link
              href="/account#account"
              role="menuitem"
              onClick={() => {
                setOpen(false)
              }}
            >
              <Settings aria-hidden="true" />
              <span>
                <strong>계정</strong>
                <small>로그인 및 계정 정보</small>
              </span>
              <b aria-hidden="true">→</b>
            </Link>
            <p className="browse-account-section-label is-support">
              SUPPORT &amp; MANAGEMENT
            </p>
            <a
              href="mailto:support@ilog.kr?subject=ilog%20고객센터%20문의"
              role="menuitem"
              onClick={() => {
                setOpen(false)
              }}
            >
              <CircleHelp aria-hidden="true" />
              <span>
                <strong>고객센터</strong>
                <small>도움이 필요하신가요?</small>
              </span>
              <b aria-hidden="true">↗</b>
            </a>
            {hasAdminAccess ? (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                }}
              >
                <ShieldCheck aria-hidden="true" />
                <span>
                  <strong>관리자 페이지</strong>
                  <small>서비스 운영 대시보드</small>
                </span>
                <b aria-hidden="true">→</b>
              </Link>
            ) : null}
          </div>

          <button
            type="button"
            className="browse-account-signout"
            role="menuitem"
            disabled={signingOut}
            onClick={() => void logout()}
          >
            <LogOut aria-hidden="true" />
            {signingOut ? '로그아웃 중…' : '로그아웃'}
          </button>
          {signOutError === null ? null : (
            <p className="browse-account-error" role="alert">
              {signOutError}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
