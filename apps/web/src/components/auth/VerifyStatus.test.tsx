// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import React, { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('token=fresh-token'),
}))

import { VerifyStatus } from './VerifyStatus'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('VerifyStatus', () => {
  it('consumes a verification token once in React Strict Mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
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
  })
})
