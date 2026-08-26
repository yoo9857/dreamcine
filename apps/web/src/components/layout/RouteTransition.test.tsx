// @vitest-environment jsdom

import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { RouteTransition } from './RouteTransition'

const route = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => route.pathname,
}))

describe('RouteTransition', () => {
  it('treats the authenticated browse route as the discovery surface', () => {
    route.pathname = '/browse'
    const view = render(
      <RouteTransition>
        <span>홈</span>
      </RouteTransition>,
    )

    expect(
      view.container.firstElementChild?.classList.contains('is-discovery-home'),
    ).toBe(true)
  })

  it('keeps the page surface mounted while the pathname changes', () => {
    route.pathname = '/'
    const view = render(
      <RouteTransition>
        <span>홈</span>
      </RouteTransition>,
    )
    const surface = view.container.firstElementChild

    route.pathname = '/following'
    view.rerender(
      <RouteTransition>
        <span>팔로잉</span>
      </RouteTransition>,
    )

    expect(view.container.firstElementChild).toBe(surface)
    expect(surface?.classList.contains('is-discovery-home')).toBe(false)
  })
})
