// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GuestSessionActions } from './GuestSessionActions'

const route = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
afterEach(cleanup)

describe('GuestSessionActions', () => {
  it.each(['/creators', '/creators/season-tags', '/browse', '/messages'])(
    'does not mount duplicate authentication controls on %s',
    (pathname) => {
      route.pathname = pathname
      const view = render(<GuestSessionActions />)
      expect(
        view.container.querySelector('.aidream-session-actions'),
      ).toBeNull()
    },
  )

  it('removes floating actions immediately when navigating to a topbar page', () => {
    route.pathname = '/search'
    const view = render(<GuestSessionActions />)
    expect(view.getByRole('link', { name: '로그인' })).toBeTruthy()
    route.pathname = '/creators/season-tags'
    view.rerender(<GuestSessionActions />)
    expect(view.container.querySelector('.aidream-session-actions')).toBeNull()
  })
})
