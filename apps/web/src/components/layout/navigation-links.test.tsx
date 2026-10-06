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
  vi.unstubAllGlobals()
  pathname = '/'
})

describe('NavigationLinks', () => {
  it('links authenticated home navigation to browse', () => {
    pathname = '/browse'
    render(<NavigationLinks authenticated />)

    const home = screen.getByRole('link', { name: '홈' })
    expect(home.getAttribute('href')).toBe('/browse')
    expect(home.getAttribute('aria-current')).toBe('page')
  })

  it('marks the current route instead of permanently highlighting home', () => {
    pathname = '/works'
    render(<NavigationLinks authenticated={false} />)

    expect(
      screen.getByRole('link', { name: '작품' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(
      screen.getByRole('link', { name: '홈' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('shows the selected destination while navigation is pending', () => {
    render(<NavigationLinks authenticated={false} />)
    const creators = screen.getByRole('link', { name: '작가' })
    creators.addEventListener('click', (event) => {
      event.preventDefault()
    })

    fireEvent.click(creators)

    expect(creators.classList.contains('is-destination')).toBe(true)
  })

  it('opens Studio for registered creators', () => {
    render(<NavigationLinks authenticated creatorRegistered mobile />)

    expect(
      screen.getByRole('link', { name: '스튜디오' }).getAttribute('href'),
    ).toBe('/studio')
  })

  it('opens creator registration for viewers', () => {
    render(<NavigationLinks authenticated mobile />)

    expect(
      screen.getByRole('link', { name: '스튜디오' }).getAttribute('href'),
    ).toBe('/creator-apply')
    expect(screen.getAllByRole('link')).toHaveLength(7)
  })

  it('shows the unread message count on the messages item', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 3 }),
      }),
    )
    render(<NavigationLinks authenticated />)

    expect(
      await screen.findByRole('link', {
        name: '메시지, 읽지 않은 메시지 3개',
      }),
    ).toBeDefined()
    expect(screen.getByText('3')).toBeDefined()
  })

  it('hides messages from guests and does not poll for them', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<NavigationLinks authenticated={false} />)

    expect(screen.queryByRole('link', { name: /메시지/u })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps Works active on series and watch detail routes', () => {
    pathname = '/series/series-1'
    const { rerender } = render(<NavigationLinks authenticated />)

    expect(
      screen.getByRole('link', { name: '작품' }).getAttribute('aria-current'),
    ).toBe('page')

    pathname = '/watch/episode-1'
    rerender(<NavigationLinks authenticated />)
    expect(
      screen.getByRole('link', { name: '작품' }).getAttribute('aria-current'),
    ).toBe('page')
  })

  it('keeps Creators active on creator profile routes', () => {
    pathname = '/u/hanbin'
    render(<NavigationLinks authenticated />)

    expect(
      screen.getByRole('link', { name: '작가' }).getAttribute('aria-current'),
    ).toBe('page')
  })

  it('shows notices to everyone in place of the old alerts item', () => {
    render(<NavigationLinks authenticated={false} />)
    expect(
      screen.getByRole('link', { name: '공지사항' }).getAttribute('href'),
    ).toBe('/notices')
    expect(screen.queryByRole('link', { name: '알람' })).toBeNull()
  })

  it('uses the rendered item count for the mobile grid', () => {
    const { container } = render(
      <NavigationLinks authenticated={false} mobile />,
    )

    expect(container.querySelector('nav')?.getAttribute('style')).toContain(
      '--nav-count: 6',
    )
  })
})
