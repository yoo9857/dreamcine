// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { DiscoveryFooter } from './DiscoveryFooter'

afterEach(cleanup)

describe('DiscoveryFooter', () => {
  it('connects discovery, creator, account, and support destinations', () => {
    render(<DiscoveryFooter handle="hanbin" />)

    expect(screen.getByRole('contentinfo', { name: 'ilog 푸터' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '홈' }).getAttribute('href')).toBe(
      '/browse',
    )
    expect(
      screen.getByRole('link', { name: '내 프로필' }).getAttribute('href'),
    ).toBe('/u/hanbin')
    expect(
      screen.getByRole('link', { name: '프로필 관리' }).getAttribute('href'),
    ).toBe('/account#profile')
    expect(
      screen.getByRole('link', { name: '고객센터' }).getAttribute('href'),
    ).toBe('mailto:support@ilog.kr')
    expect(
      screen.getByRole('link', { name: /맨 위로/u }).getAttribute('href'),
    ).toBe('#discovery-top')
  })
})
