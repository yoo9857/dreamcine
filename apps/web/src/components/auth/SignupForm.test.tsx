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

import { SignupForm } from './SignupForm'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SignupForm plan intent', () => {
  it('keeps the selected ads plan in the signup request and login handoff', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <SignupForm
        initialEmail="viewer@example.com"
        locale="ko"
        market="kr"
        plan="ads-standard"
      />,
    )

    expect(screen.getByTestId('selected-plan').textContent).toContain(
      '광고형 스탠다드',
    )
    fireEvent.change(screen.getByLabelText('아이디'), {
      target: { value: 'viewer_01' },
    })
    fireEvent.change(screen.getByLabelText('표시 이름'), {
      target: { value: 'Viewer' },
    })
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'safe-password-123' },
    })
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce()
    })
    const request = fetchMock.mock.calls[0]?.[1] as { body?: string }
    expect(JSON.parse(request.body ?? '{}')).toMatchObject({
      plan: 'ads-standard',
      lang: 'ko',
      market: 'kr',
    })

    const loginLink = await screen.findByTestId('signup-sent')
    expect(loginLink.getAttribute('href')).toContain('next=')
    expect(loginLink.getAttribute('href')).toContain('%2Fads-plan')
  })
})
