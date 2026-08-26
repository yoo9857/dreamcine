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

const user = {
  handle: 'hanbin',
  displayName: '한빈',
  email: 'hanbin@example.com',
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
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
      expect(signOut).toHaveBeenCalledWith({ redirectTo: '/' })
    })
  })
})
