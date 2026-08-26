// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GuestCoverflow } from './GuestCoverflow'

const items = Array.from({ length: 6 }, (_, index) => ({
  episodeId: `episode-${String(index + 1)}`,
  title: `이야기 ${String(index + 1)}`,
  creatorName: `크리에이터 ${String(index + 1)}`,
  thumbnailUrl: null,
}))

class ResizeObserverStub {
  observe(): void {
    return undefined
  }
  disconnect(): void {
    return undefined
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia,
  )
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(240)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('GuestCoverflow', () => {
  it('centres the first card and updates its real episode caption', () => {
    render(<GuestCoverflow items={items} />)

    const first = screen.getByRole('group', { name: '1 / 6: 이야기 1' })
    const second = screen.getByRole('group', { name: '2 / 6: 이야기 2' })

    expect(first.style.transform).toContain('translateX(calc(-50% + 0px))')
    expect(second.style.transform).not.toBe(first.style.transform)
    expect(screen.getByRole('heading', { name: '이야기 1' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '다음 이야기' }))

    expect(screen.getByRole('heading', { name: '이야기 2' })).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: /\uc9c0\uae08 \ubcf4\uae30/u })
        .getAttribute('href'),
    ).toBe('/watch/episode-2')
  })
})
