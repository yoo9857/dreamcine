// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import React, { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('token=fresh-token'),
  useRouter: () => navigation,
}))

import { VerifyStatus } from './VerifyStatus'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  navigation.replace.mockReset()
  navigation.refresh.mockReset()
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
})
