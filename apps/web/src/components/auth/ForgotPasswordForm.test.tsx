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

import { ForgotPasswordForm } from './ForgotPasswordForm'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ForgotPasswordForm', () => {
  it('passes the selected language to the reset request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(<ForgotPasswordForm locale="en" />)

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'viewer@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/password/forgot',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'viewer@example.com', lang: 'en' }),
      }),
    )
    expect(await screen.findByText('Check your inbox')).toBeTruthy()
  })
})
