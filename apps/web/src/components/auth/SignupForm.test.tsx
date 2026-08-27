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
  it('keeps the selected ads plan and requires email verification before login', async () => {
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

    expect(await screen.findByText('인증 메일을 보냈습니다')).toBeTruthy()
    expect(screen.queryByRole('link', { name: '로그인' })).toBeNull()
    expect(
      screen.getByText(/메일의 링크를 열면 가입이 완료됩니다/u),
    ).toBeTruthy()
  })

  it('does not describe a failed verification email as completed signup', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ verificationEmailSent: false }),
      }),
    )

    render(<SignupForm locale="ko" market="kr" />)

    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'pending@example.com' },
    })
    fireEvent.change(screen.getByLabelText('이메일 주소 확인'), {
      target: { value: 'pending@example.com' },
    })
    fireEvent.change(screen.getByLabelText('아이디'), {
      target: { value: 'pending_01' },
    })
    fireEvent.change(screen.getByLabelText('표시 이름'), {
      target: { value: 'Pending' },
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

    expect(await screen.findByText('가입이 완료되지 않았습니다')).toBeTruthy()
    expect(screen.getByText(/인증 전에는 로그인할 수 없습니다/u)).toBeTruthy()
    expect(screen.queryByRole('link', { name: '로그인' })).toBeNull()
  })
})
