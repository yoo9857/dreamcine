'use client'

import { CircleHelp, LogOut, Settings, Sparkles, UserRound } from 'lucide-react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import React, { useEffect, useRef, useState, type ReactNode } from 'react'

interface BrowseAccountMenuProps {
  readonly user: {
    readonly handle: string
    readonly displayName: string
    readonly email: string
  }
}

export function BrowseAccountMenu({ user }: BrowseAccountMenuProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeFromOutside = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeFromKeyboard = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeFromOutside)
    document.addEventListener('keydown', closeFromKeyboard)
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside)
      document.removeEventListener('keydown', closeFromKeyboard)
    }
  }, [open])

  async function logout(): Promise<void> {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut({ redirectTo: '/' })
    } catch {
      setSigningOut(false)
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
          <strong>{user.displayName}</strong>
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
              <p>{user.displayName}</p>
              <span>@{user.handle}</span>
              <small>{user.email}</small>
            </div>
            <Sparkles aria-hidden="true" />
          </header>

          <div className="browse-account-links">
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
              href="/account#profile"
              role="menuitem"
              onClick={() => {
                setOpen(false)
              }}
            >
              <Sparkles aria-hidden="true" />
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
        </div>
      ) : null}
    </div>
  )
}
