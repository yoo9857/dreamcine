// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SignupForm } from './SignupForm'

class ResizeObserverStub {
  observe(): void {
    return undefined
  }

  unobserve(): void {
    return undefined
  }

  disconnect(): void {
    return undefined
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SignupForm plan intent', () => {
  it('keeps the selected ads plan in the signup request and login handoff', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ verificationEmailSent: true }),
    })
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
    fireEvent.change(screen.getByLabelText('생년월일'), {
      target: { value: '1995-06-15' },
    })
    fireEvent.click(
      screen.getByLabelText(
        '이용약관 및 개인정보 처리방침에 동의합니다. (필수)',
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce()
    })
    const request = fetchMock.mock.calls[0]?.[1] as { body?: string }
    expect(JSON.parse(request.body ?? '{}')).toMatchObject({
      plan: 'ads-standard',
      lang: 'ko',
      market: 'kr',
      birthDate: '1995-06-15',
      gender: 'PREFER_NOT_TO_SAY',
      signupPurpose: 'VIEWER',
      country: 'KR',
      acceptTerms: true,
      marketingConsent: false,
    })

    const loginLink = await screen.findByTestId('signup-sent')
    expect(loginLink.getAttribute('href')).toContain('next=')
    expect(loginLink.getAttribute('href')).toContain('%2Fads-plan')
  })
})
