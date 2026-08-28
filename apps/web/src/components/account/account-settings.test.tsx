// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AccountSettingsForm } from './AccountSettingsForm'
import { AccountDeletionPanel } from './AccountDeletionPanel'
import { ConsentPreferences } from './ConsentPreferences'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

describe('account settings', () => {
  beforeEach(() => {
    refresh.mockClear()
    vi.restoreAllMocks()
  })

  it('shows a public profile shortcut and saves trimmed profile fields', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ displayName: 'Administrator' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    render(
      <AccountSettingsForm
        handle="admin"
        avatarUrl={null}
        initialDisplayName="Administrator"
        initialBio="소개"
      />,
    )

    expect(
      screen.getByRole('link', { name: '미리보기 ↗' }).getAttribute('href'),
    ).toBe('/u/admin')
    fireEvent.change(screen.getByLabelText('표시 이름'), {
      target: { value: '  Administrator  ' },
    })
    fireEvent.change(screen.getByLabelText('소개'), {
      target: { value: '  새로운 소개  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce()
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Administrator',
        bio: '새로운 소개',
      }),
    })
    expect(await screen.findByText('변경사항을 저장했습니다.')).not.toBeNull()
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('updates marketing consent with clear Korean feedback', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }))
    render(
      <ConsentPreferences
        initialMarketing={false}
        termsVersion="v1"
        privacyVersion="v1"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '수신 동의' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce()
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/account/consents', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ marketing: true }),
    })
    expect(
      await screen.findByText('마케팅 이메일 수신에 동의했습니다.'),
    ).not.toBeNull()
  })

  it('requires handle, password, and explicit consent before account deletion', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: '테스트에서는 삭제하지 않습니다.' },
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      ),
    )
    render(<AccountDeletionPanel handle="admin" hasPassword />)

    fireEvent.click(screen.getByRole('button', { name: '회원탈퇴' }))
    const deleteButton = screen.getByRole('button', { name: '계정 삭제 요청' })
    expect(deleteButton.hasAttribute('disabled')).toBe(true)

    fireEvent.change(screen.getByLabelText(/확인을 위해/u), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByLabelText('현재 비밀번호'), {
      target: { value: 'current password' },
    })
    fireEvent.click(
      screen.getByLabelText('30일 복구 기간과 영구 삭제 절차를 확인했습니다.'),
    )
    expect(deleteButton.hasAttribute('disabled')).toBe(false)
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/account', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          confirmation: 'admin',
          password: 'current password',
        }),
      })
    })
    expect(
      await screen.findByText('테스트에서는 삭제하지 않습니다.'),
    ).not.toBeNull()
  })
})
