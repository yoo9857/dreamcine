// @vitest-environment jsdom

import type { Notification } from '@aidream/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { NotificationList } from './NotificationList'

describe('NotificationList', () => {
  it('renders a type label and marks unread notifications', async () => {
    const item: Notification = {
      id: 'notification_1',
      userId: 'user_1',
      type: 'NEW_FOLLOWER',
      payload: { type: 'NEW_FOLLOWER', actorId: 'actor_1' },
      readAt: null,
      createdAt: new Date('2026-08-25T00:00:00.000Z'),
    }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(<NotificationList initialItems={[item]} />)

    expect(screen.getByText('새 팔로워가 생겼습니다.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '모두 읽음' }))
    await waitFor(() => {
      expect(
        screen
          .getByRole('button', { name: '모두 읽음' })
          .hasAttribute('disabled'),
      ).toBe(true)
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notifications/read',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('renders the empty state', () => {
    render(<NotificationList initialItems={[]} />)
    expect(screen.getByText('새 알림이 없습니다.')).toBeTruthy()
  })
})
