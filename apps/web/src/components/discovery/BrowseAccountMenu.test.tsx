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
  it('explains creator tiers from the ? button and links to the tier page', () => {
    render(<BrowseAccountMenu user={user} />)
    fireEvent.click(screen.getByRole('button', { name: '한빈 계정 메뉴' }))

    const help = screen.getByRole('menuitem', { name: '크리에이터 등급 설명' })
    expect(help.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('note')).toBeNull()

    fireEvent.click(help)
    expect(help.getAttribute('aria-expanded')).toBe('true')
    const guide = screen.getByRole('note', { name: '크리에이터 등급 안내' })
    expect(guide.textContent).toContain('5,000점~')
    expect(
      guide.querySelector('[aria-current="true"]')?.getAttribute('data-tier'),
    ).toBe('GOLD')
    expect(
      screen
        .getByRole('menuitem', { name: /자세히 보기/u })
        .getAttribute('href'),
    ).toBe('/account/tier')
    expect(
      screen.getByRole('menuitem', { name: /내 등급/u }).getAttribute('href'),
    ).toBe('/account/tier')

    fireEvent.click(help)
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('closes only the tier guide on Escape and keeps the ? in the menu', () => {
    render(<BrowseAccountMenu user={user} />)
    fireEvent.click(screen.getByRole('button', { name: '한빈 계정 메뉴' }))
    const help = screen.getByRole('menuitem', { name: '크리에이터 등급 설명' })
    fireEvent.click(help)
    expect(screen.getByRole('note')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('note')).toBeNull()
    expect(screen.getByRole('menu')).toBeTruthy()
    expect(document.activeElement).toBe(help)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })

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
    expect(screen.getByText('ILOG MEMBERSHIP')).toBeTruthy()
    expect(screen.getByText('GOLD')).toBeTruthy()
    expect(screen.getByText('ACTIVE')).toBeTruthy()
  })

  it('shows the base tier inside the private account summary', () => {
    render(<BrowseAccountMenu user={{ ...user, tier: 'BRONZE' }} />)
    fireEvent.click(screen.getByRole('button', { name: /계정 메뉴/u }))

    expect(screen.getByText('BRONZE')).toBeTruthy()
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
