// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DiscoveryBackdrop } from './DiscoveryBackdrop'
import { HeroLikeButton } from './HeroLikeButton'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('discovery home controls', () => {
  it('sends signed-out likes to login without issuing a request', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(
      <HeroLikeButton
        episodeId="episode_1"
        initialLiked={false}
        initialCount={7}
        authenticated={false}
      />,
    )

    expect(
      screen
        .getByRole('link', { name: '로그인하고 좋아요 누르기, 현재 7개' })
        .getAttribute('href'),
    ).toBe('/login?next=%2F')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('updates the real like state for a signed-in viewer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ liked: true, likeCount: 8 }),
      }),
    )

    render(
      <HeroLikeButton
        episodeId="episode_1"
        initialLiked={false}
        initialCount={7}
        authenticated
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '좋아요, 현재 7개' }))

    await waitFor(() => {
      expect(
        screen
          .getByRole('button', { name: '좋아요 취소, 현재 8개' })
          .getAttribute('aria-pressed'),
      ).toBe('true')
    })
  })

  it('does not fetch or render motion when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<DiscoveryBackdrop episodeId="episode_1" />)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(container.querySelector('video')).toBeNull()
  })

  it('does not load decorative video on a constrained viewport', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(max-width: 767px)',
      })),
    )
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<DiscoveryBackdrop episodeId="episode_1" />)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(container.querySelector('video')).toBeNull()
  })

  it('loads the primary landing video on a constrained viewport', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(max-width: 767px)',
      })),
    )
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => undefined))
    vi.stubGlobal('fetch', fetchMock)

    render(<DiscoveryBackdrop episodeId="episode_1" loadOnMobile />)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/episodes/episode_1/playback',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
  })
})
