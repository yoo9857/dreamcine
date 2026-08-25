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

import { FollowButton } from './FollowButton'
import { LikeButton } from './LikeButton'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('social buttons', () => {
  it('rolls back an optimistic like when the API fails', async () => {
    let rejectRequest: ((value: { ok: boolean }) => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            rejectRequest = resolve
          }),
      ),
    )
    render(
      <LikeButton
        episodeId="episode_1"
        initialLiked={false}
        initialCount={4}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '좋아요 4' }))
    expect(
      screen
        .getByRole('button', { name: /좋아요 5/u })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    rejectRequest?.({ ok: false })

    await waitFor(() => {
      expect(
        screen
          .getByRole('button', { name: '좋아요 4' })
          .getAttribute('aria-pressed'),
      ).toBe('false')
    })
    expect(screen.getByRole('alert').textContent).toContain('다시 시도')
  })

  it('locks duplicate follow requests while one is pending', async () => {
    let resolveRequest:
      | ((value: {
          ok: boolean
          json: () => Promise<{ followerCount: number }>
        }) => void)
      | undefined
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(
      <FollowButton
        handle="creator"
        initialFollowing={false}
        initialCount={2}
      />,
    )

    const button = screen.getByRole('button', { name: /팔로우/u })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(fetchMock).toHaveBeenCalledOnce()
    if (resolveRequest !== undefined) {
      resolveRequest({
        ok: true,
        json: () => Promise.resolve({ followerCount: 3 }),
      })
    }
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /팔로잉/u }).textContent,
      ).toContain('3')
    })
  })
})
