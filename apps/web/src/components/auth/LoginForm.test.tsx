// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import React from 'react'
import { signIn } from 'next-auth/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LoginForm } from './LoginForm'

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => navigation,
}))

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('LoginForm', () => {
  it('opens the browse home after a login without a next route', async () => {
    vi.mocked(signIn).mockResolvedValue({
      error: undefined,
      code: undefined,
      status: 200,
      ok: true,
      url: null,
    })
    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('이메일 또는 아이디'), {
      target: { value: 'admin@admin' },
    })
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'test-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith('/browse')
    })
    expect(navigation.refresh).toHaveBeenCalled()
  })

  it('submits the local administrator email without browser email validation', async () => {
    vi.mocked(signIn).mockResolvedValue({
      error: 'CredentialsSignin',
      code: 'credentials',
      status: 401,
      ok: false,
      url: null,
    })
    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('이메일 또는 아이디'), {
      target: { value: 'admin@admin' },
    })
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'test-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'admin@admin',
        password: 'test-password',
        redirect: false,
      })
    })
  })

  it('keeps validation feedback connected to the redesigned fields', async () => {
    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('이메일 또는 아이디'), {
      target: { value: '!' },
    })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(
        screen
          .getByLabelText('이메일 또는 아이디')
          .getAttribute('aria-invalid'),
      ).toBe('true')
    })
    expect(
      screen
        .getByLabelText('이메일 또는 아이디')
        .getAttribute('aria-describedby'),
    ).toBeTruthy()
    expect(
      screen.getByLabelText('비밀번호').getAttribute('aria-describedby'),
    ).toBeTruthy()
  })

  it('shows a stable error when the authentication service is unavailable', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('network unavailable'))
    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('이메일 또는 아이디'), {
      target: { value: 'hanbin@example.com' },
    })
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'test-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      '이메일 또는 비밀번호가 올바르지 않습니다.',
    )
    expect(navigation.push).not.toHaveBeenCalled()
  })

  it('explains when simultaneous login attempts exceed the limit', async () => {
    vi.mocked(signIn).mockResolvedValue({
      error: 'CredentialsSignin',
      code: 'credentials',
      status: 429,
      ok: false,
      url: null,
    })
    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('이메일 또는 아이디'), {
      target: { value: 'hanbin@example.com' },
    })
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'test-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      '요청이 너무 많습니다.',
    )
  })
})
