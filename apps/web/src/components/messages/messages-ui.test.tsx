// @vitest-environment jsdom

import type { ConversationSummary } from '@aidream/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConversationList } from './ConversationList'
import { listTime } from './format-time'
import { MessageComposer } from './MessageComposer'

vi.mock('next/navigation', () => ({
  usePathname: () => '/messages',
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function summary(
  overrides: Partial<ConversationSummary> = {},
): ConversationSummary {
  return {
    id: 'conv_1',
    other: {
      handle: 'creator',
      displayName: '한빈',
      avatarUrl: null,
      tier: 'GOLD',
      isVerified: true,
    },
    startedByMe: true,
    lastMessageAt: '2026-10-06T03:00:00.000Z',
    lastMessagePreview: '다음 화 언제 나와요?',
    lastMessageMine: true,
    unread: 0,
    ...overrides,
  }
}

describe('MessageComposer', () => {
  function setup(onSend = vi.fn().mockResolvedValue(true)) {
    render(<MessageComposer placeholder="메시지 보내기" onSend={onSend} />)
    return {
      onSend,
      input: screen.getByPlaceholderText<HTMLTextAreaElement>('메시지 보내기'),
    }
  }

  it('sends on Enter and clears the input after success', async () => {
    const { onSend, input } = setup()
    fireEvent.change(input, { target: { value: '  안녕하세요  ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSend).toHaveBeenCalledWith('안녕하세요')
    await vi.waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  it('keeps Shift+Enter and Korean composition from sending', () => {
    const { onSend, input } = setup()
    fireEvent.change(input, { target: { value: '첫 줄' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })

    expect(onSend).not.toHaveBeenCalled()
  })

  it('keeps the text when sending fails so nothing is lost', async () => {
    const { input } = setup(vi.fn().mockResolvedValue(false))
    fireEvent.change(input, { target: { value: '중요한 말' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: '보내기' })).toBeDefined()
    })
    expect(input.value).toBe('중요한 말')
  })

  it('shows the count near the limit and blocks sending past it', () => {
    const { onSend, input } = setup()
    fireEvent.change(input, { target: { value: 'a'.repeat(2001) } })

    expect(screen.getByText('2,001 / 2,000')).toBeDefined()
    expect(
      screen.getByRole('button', { name: '보내기' }).hasAttribute('disabled'),
    ).toBe(true)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
  })
})

describe('ConversationList', () => {
  it('shows unread counts except on the open conversation', () => {
    vi.stubGlobal('fetch', vi.fn())
    render(
      <ConversationList
        initialItems={[
          summary({ unread: 3, lastMessageMine: false }),
          summary({
            id: 'conv_2',
            unread: 5,
            other: { ...summary().other, handle: 'b', displayName: '민서' },
          }),
        ]}
        initialCursor={null}
        activeId="conv_2"
      />,
    )

    expect(screen.getByLabelText('읽지 않은 메시지 3개')).toBeDefined()
    expect(screen.queryByLabelText('읽지 않은 메시지 5개')).toBeNull()
    expect(
      screen.getByRole('link', { name: /민서/u }).getAttribute('aria-current'),
    ).toBe('page')
  })

  it('marks the last message as mine', () => {
    vi.stubGlobal('fetch', vi.fn())
    render(<ConversationList initialItems={[summary()]} initialCursor={null} />)
    expect(screen.getByText('나: 다음 화 언제 나와요?')).toBeDefined()
  })

  it('points an empty inbox to the creator directory', () => {
    vi.stubGlobal('fetch', vi.fn())
    render(<ConversationList initialItems={[]} initialCursor={null} />)
    expect(
      screen.getByRole('link', { name: '작가 둘러보기' }).getAttribute('href'),
    ).toBe('/creators')
  })
})

describe('listTime', () => {
  const now = new Date('2026-10-06T06:00:00.000Z') // 서울 오후 3시

  it('shows the time today, 어제 yesterday and the date before that', () => {
    expect(listTime('2026-10-06T01:05:00.000Z', now)).toMatch(/10:05/u)
    expect(listTime('2026-10-05T01:00:00.000Z', now)).toBe('어제')
    expect(listTime('2026-09-01T01:00:00.000Z', now)).toBe('9월 1일')
    expect(listTime('2025-09-01T01:00:00.000Z', now)).toBe('2025. 09. 01')
  })
})
