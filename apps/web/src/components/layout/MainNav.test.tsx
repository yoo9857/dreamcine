// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import { MainNav } from './MainNav'

describe('MainNav', () => {
  it('does not flash guest actions while the session is loading', () => {
    const view = render(<MainNav session={null} pending />)

    expect(screen.queryByRole('link', { name: '회원가입' })).toBeNull()
    expect(screen.queryByRole('link', { name: '로그인' })).toBeNull()
    expect(view.container.querySelector('.aidream-session-actions')).toBeNull()
    expect(
      view.container.querySelectorAll('.aidream-nav-skeleton i'),
    ).toHaveLength(4)
  })
})
