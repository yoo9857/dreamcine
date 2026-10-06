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

import { NotificationBell } from './NotificationBell'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function item(id: string, type: string, read: boolean, payload: unknown = {}) {
  return {
    id,
    userId: 'me',
    type,
    payload: { type, ...(payload as object) },
    readAt: read ? '2026-10-06T00:00:00.000Z' : null,
    createdAt: '2026-10-06T00:00:00.000Z',
  }
}

function stubApi(items: unknown[]) {
  const fetchMock = vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve(
          url.startsWith('/api/notifications/read')
            ? { updated: 1 }
            : { items, nextCursor: null },
        ),
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('NotificationBell', () => {
  it('shows the unread count on the bell before it is opened', async () => {
    stubApi([
      item('n1', 'NEW_FOLLOWER', false, { actorId: 'a' }),
      item('n2', 'NEW_LIKE', true, { actorId: 'a', episodeId: 'e1' }),
    ])
    render(<NotificationBell />)

    expect(
      await screen.findByRole('button', { name: '알림, 읽지 않은 알림 1개' }),
    ).toBeDefined()
  })

  it('opens a popup with links to the related episode and the full list', async () => {
    stubApi([
      item('n1', 'NEW_COMMENT', false, {
        actorId: 'a',
        episodeId: 'ep_9',
        commentId: 'c1',
      }),
    ])
    render(<NotificationBell />)
    fireEvent.click(await screen.findByRole('button', { name: /알림/u }))

    const dialog = await screen.findByRole('dialog', { name: '알림' })
    expect(dialog).toBeDefined()
    expect(
      screen
        .getByRole('link', { name: /에피소드에 새 댓글/u })
        .getAttribute('href'),
    ).toBe('/watch/ep_9')
    expect(
      screen.getByRole('link', { name: '알림 전체 보기' }).getAttribute('href'),
    ).toBe('/notifications')
  })

  it('marks everything read and clears the badge', async () => {
    const fetchMock = stubApi([
      item('n1', 'NEW_FOLLOWER', false, { actorId: 'a' }),
      item('n2', 'MODERATION', false, { targetId: 't' }),
    ])
    render(<NotificationBell />)
    fireEvent.click(
      await screen.findByRole('button', { name: '알림, 읽지 않은 알림 2개' }),
    )
    fireEvent.click(await screen.findByRole('button', { name: /모두 읽음/u }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '알림' })).toBeDefined()
    })
    const readCall = fetchMock.mock.calls.find(([url]) =>
      url.startsWith('/api/notifications/read'),
    )
    expect(readCall).toBeDefined()
  })

  it('closes on Escape', async () => {
    stubApi([])
    render(<NotificationBell />)
    fireEvent.click(await screen.findByRole('button', { name: '알림' }))
    expect(await screen.findByRole('dialog')).toBeDefined()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
