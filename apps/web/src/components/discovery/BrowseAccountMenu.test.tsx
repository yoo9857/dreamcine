// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { signOut } from 'next-auth/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BrowseAccountMenu } from './BrowseAccountMenu'

vi.mock('next-auth/react', () => ({ signOut: vi.fn() }))

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => navigation,
}))

const user = {
  id: 'user_hanbin',
  handle: 'hanbin',
  displayName: '한빈',
  email: 'hanbin@example.com',
  role: 'CREATOR',
  status: 'ACTIVE',
  emailVerified: true,
  tier: 'GOLD',
  isVerified: true,
} as const

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.mocked(signOut).mockResolvedValue({ url: '/' })
})

describe('BrowseAccountMenu', () => {
  it('exposes working profile, account, and support destinations', () => {
    render(<BrowseAccountMenu user={user} />)
    fireEvent.click(screen.getByRole('button', { name: '한빈 계정 메뉴' }))

    expect(screen.getByRole('menu')).toBeTruthy()
    expect(
      screen.getByRole('menuitem', { name: /내 프로필/u }).getAttribute('href'),
    ).toBe('/u/hanbin')
    expect(
      screen
        .getByRole('menuitem', { name: /프로필 관리/u })
        .getAttribute('href'),
    ).toBe('/account#profile')
    expect(
      screen.getByRole('menuitem', { name: /^계정/u }).getAttribute('href'),
    ).toBe('/account#account')
    expect(
      screen.getByRole('menuitem', { name: /고객센터/u }).getAttribute('href'),
    ).toContain('mailto:support@ilog.kr')
    expect(
      screen.queryByRole('menuitem', { name: /관리자 페이지/u }),
    ).toBeNull()
  })

  it('places the admin dashboard directly after support for administrators', () => {
    render(<BrowseAccountMenu user={{ ...user, role: 'ADMIN' }} />)
    fireEvent.click(screen.getByRole('button', { name: '한빈 계정 메뉴' }))

    const support = screen.getByRole('menuitem', { name: /고객센터/u })
    const admin = screen.getByRole('menuitem', { name: /관리자 페이지/u })
    const items = screen.getAllByRole('menuitem')

    expect(admin.getAttribute('href')).toBe('/admin')
    expect(items.indexOf(admin)).toBe(items.indexOf(support) + 1)
  })

  it('closes with Escape and restores focus to the character button', () => {
    render(<BrowseAccountMenu user={user} />)
    const trigger = screen.getByRole('button', { name: '한빈 계정 메뉴' })
    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('revokes the session and returns to the public landing', async () => {
    render(<BrowseAccountMenu user={user} />)
    fireEvent.click(screen.getByRole('button', { name: '한빈 계정 메뉴' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '로그아웃' }))

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith({ redirect: false, redirectTo: '/' })
    })
    expect(navigation.replace).toHaveBeenCalledWith('/')
    expect(navigation.refresh).toHaveBeenCalled()
  })

  it('keeps the session UI available when logout fails', async () => {
    vi.mocked(signOut).mockRejectedValue(new Error('auth unavailable'))
    render(<BrowseAccountMenu user={user} />)
    fireEvent.click(screen.getByRole('button', { name: '한빈 계정 메뉴' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '로그아웃' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      '로그아웃하지 못했습니다.',
    )
    expect(navigation.replace).not.toHaveBeenCalled()
  })
})
