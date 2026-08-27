// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import React, { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  search: 'token=fresh-token',
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => navigation,
}))

import { VerifyStatus } from './VerifyStatus'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  navigation.replace.mockReset()
  navigation.refresh.mockReset()
  navigation.search = 'token=fresh-token'
})

describe('VerifyStatus', () => {
  it('consumes a verification token once in React Strict Mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ userId: 'user_1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <StrictMode>
        <VerifyStatus />
      </StrictMode>,
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce()
    })
    expect(await screen.findByTestId('verify-success')).toBeTruthy()
    expect(screen.getByText(/로그인 화면으로 이동합니다/u)).toBeTruthy()
    await waitFor(
      () => {
        expect(navigation.replace).toHaveBeenCalledWith('/login')
        expect(navigation.refresh).toHaveBeenCalledOnce()
      },
      { timeout: 2_000 },
    )
  })

  it('resends from an expired-link screen without returning to signup', async () => {
    navigation.search = 'lang=ko&market=kr'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    render(<VerifyStatus />)

    fireEvent.click(
      await screen.findByRole('button', { name: '인증 메일 다시 받기' }),
    )
    fireEvent.change(screen.getByLabelText('이메일 주소'), {
      target: { value: 'viewer@mail.ilog.info' },
    })
    fireEvent.click(screen.getByRole('button', { name: '새 인증 링크 보내기' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/verification/resend',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    expect(
      await screen.findByText(/받은편지함과 스팸함을 확인해 주세요/u),
    ).toBeTruthy()
    expect(navigation.replace).not.toHaveBeenCalled()
  })
})
