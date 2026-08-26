// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NavigationLinks } from './NavigationLinks'

let pathname = '/'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

afterEach(() => {
  cleanup()
  pathname = '/'
})

describe('NavigationLinks', () => {
  it('links authenticated home navigation to browse', () => {
    pathname = '/browse'
    render(<NavigationLinks authenticated />)

    const home = screen.getByRole('link', { name: '인기' })
    expect(home.getAttribute('href')).toBe('/browse')
    expect(home.getAttribute('aria-current')).toBe('page')
  })

  it('marks the current route instead of permanently highlighting home', () => {
    pathname = '/search'
    render(<NavigationLinks authenticated={false} />)

    expect(
      screen.getByRole('link', { name: '검색' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(
      screen.getByRole('link', { name: '인기' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('shows the selected destination while navigation is pending', () => {
    render(<NavigationLinks authenticated={false} />)
    const following = screen.getByRole('link', { name: '팔로잉' })
    following.addEventListener('click', (event) => {
      event.preventDefault()
    })

    fireEvent.click(following)

    expect(following.classList.contains('is-destination')).toBe(true)
  })

  it('keeps upload inside Studio for authenticated mobile users', () => {
    render(<NavigationLinks authenticated mobile />)

    expect(
      screen.getByRole('link', { name: '업로드' }).getAttribute('href'),
    ).toBe('/studio')
  })
})
