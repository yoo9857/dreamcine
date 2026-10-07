// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HelpChat } from './HelpChat'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('HelpChat', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('opens the live chat from the corner cloud', async () => {
    render(<HelpChat />)

    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(
      await screen.findByRole('button', {
        name: '도움이 필요하시면 바로 물어보세요.',
      }),
    )

    expect(screen.getByRole('dialog', { name: '고객 상담' })).toBeTruthy()
    expect(screen.getByText(/ilog 고객 상담입니다/)).toBeTruthy()
  })

  it('answers a suggested question from the corner panel', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({
            answer:
              'ilog는 AI 드라마와 AI 영화를 발견하고, 감상하고, 공개하는 공간입니다.',
            href: '/about',
            linkLabel: 'ilog 소개',
          }),
        ),
      ),
    )
    render(<HelpChat />)

    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '고객 상담' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'ilog가 어떤 서비스인가요?' }),
    )

    expect(await screen.findByText(/AI 드라마/)).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'ilog 소개' }).getAttribute('href'),
    ).toBe('/about')
  })

  it('closes with escape', () => {
    render(<HelpChat />)
    fireEvent.click(screen.getByRole('button', { name: '고객 상담' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('works when session storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('disabled')
    })
    render(<HelpChat initialOpen />)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('retries a failed answer and allows clearing the conversation', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(
        jsonResponse({
          answer: '다시 연결되었습니다.',
          href: null,
          linkLabel: null,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    render(<HelpChat initialOpen />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '로그인 방법' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보내기' }))
    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('다시 연결되었습니다.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '대화 삭제' }))
    expect(screen.queryByText('다시 연결되었습니다.')).toBeNull()
  })

  it('does not expose untrusted response links', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({
            answer: '안내입니다.',
            href: '/%5cevil.example',
            linkLabel: '외부 로그인',
          }),
        ),
      ),
    )
    render(<HelpChat initialOpen />)
    fireEvent.click(
      screen.getByRole('button', { name: 'ilog가 어떤 서비스인가요?' }),
    )
    await screen.findByText('안내입니다.')
    expect(screen.queryByRole('link', { name: '외부 로그인' })).toBeNull()
  })
})
