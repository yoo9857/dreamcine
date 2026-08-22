import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RouteSession } from './types'

const mocks = vi.hoisted(() => ({
  cookieStore: new Map<string, string>(),
  getSessionByToken: vi.fn<(token: string | undefined) => Promise<unknown>>(),
  redirect: vi.fn<(to: string) => never>(),
}))

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => {
        const value = mocks.cookieStore.get(name)
        return value === undefined ? undefined : { name, value }
      },
    }),
}))

vi.mock('next/navigation', () => ({
  redirect: (to: string) => mocks.redirect(to),
}))

vi.mock('./session', async () => {
  const actual = await vi.importActual<typeof import('./session')>('./session')
  return {
    ...actual,
    getSessionByToken: mocks.getSessionByToken,
  }
})

const { getServerSession, requireCapability } = await import('./server-session')

function session(overrides: Partial<RouteSession['user']> = {}): RouteSession {
  return {
    userId: 'usr_1',
    expiresAt: new Date(Date.now() + 60_000),
    user: {
      id: 'usr_1',
      handle: 'creator',
      email: 'creator@example.com',
      displayName: '제작자',
      role: 'CREATOR',
      status: 'ACTIVE',
      emailVerified: true,
      ...overrides,
    },
  }
}

beforeEach(() => {
  mocks.cookieStore.clear()
  mocks.getSessionByToken.mockReset()
  mocks.getSessionByToken.mockResolvedValue(null)
  mocks.redirect.mockReset()
  // 실제 redirect() 는 던져서 렌더를 끊는다. 그 동작을 흉내낸다.
  mocks.redirect.mockImplementation((to: string) => {
    throw new Error(`REDIRECT:${to}`)
  })
})

describe('getServerSession', () => {
  it('쿠키가 없으면 토큰 없이 물어본다', async () => {
    await expect(getServerSession()).resolves.toBeNull()

    expect(mocks.getSessionByToken).toHaveBeenCalledWith(undefined)
  })

  it('세션 쿠키에서 토큰을 꺼낸다', async () => {
    mocks.cookieStore.set('authjs.session-token', 'tok_1')
    mocks.getSessionByToken.mockResolvedValue(session())

    await getServerSession()

    expect(mocks.getSessionByToken).toHaveBeenCalledWith('tok_1')
  })

  it('__Secure- 접두사 쿠키도 읽는다', async () => {
    mocks.cookieStore.set('__Secure-authjs.session-token', 'tok_secure')

    await getServerSession()

    expect(mocks.getSessionByToken).toHaveBeenCalledWith('tok_secure')
  })

  it('판정은 session.ts 에 맡긴다', async () => {
    // 만료·롤링·정지 처리가 두 벌이 되면 한쪽만 고쳐지는 날이 온다.
    const found = session()
    mocks.cookieStore.set('authjs.session-token', 'tok_1')
    mocks.getSessionByToken.mockResolvedValue(found)

    await expect(getServerSession()).resolves.toBe(found)
  })
})

describe('requireCapability', () => {
  it('권한이 있으면 세션을 돌려준다', async () => {
    mocks.cookieStore.set('authjs.session-token', 'tok_1')
    mocks.getSessionByToken.mockResolvedValue(session())

    await expect(
      requireCapability('upload.create', '/studio'),
    ).resolves.toMatchObject({ userId: 'usr_1' })
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('세션이 없으면 로그인으로 보내고 돌아올 경로를 남긴다', async () => {
    await expect(
      requireCapability('upload.create', '/studio/upload'),
    ).rejects.toThrow('REDIRECT:/login?next=%2Fstudio%2Fupload')
  })

  it('역할이 모자라면 로그인이 아니라 홈으로 보낸다', async () => {
    // 로그인한 사용자를 로그인으로 보내면 "또 로그인하라네" 가 된다.
    mocks.cookieStore.set('authjs.session-token', 'tok_1')
    mocks.getSessionByToken.mockResolvedValue(session({ role: 'VIEWER' }))

    await expect(requireCapability('upload.create', '/studio')).rejects.toThrow(
      'REDIRECT:/',
    )
  })

  it('정지 계정을 막는다', async () => {
    mocks.cookieStore.set('authjs.session-token', 'tok_1')
    mocks.getSessionByToken.mockResolvedValue(session({ status: 'SUSPENDED' }))

    await expect(requireCapability('upload.create', '/studio')).rejects.toThrow(
      'REDIRECT:/',
    )
  })

  it('이메일 미인증을 막는다', async () => {
    mocks.cookieStore.set('authjs.session-token', 'tok_1')
    mocks.getSessionByToken.mockResolvedValue(session({ emailVerified: false }))

    await expect(requireCapability('upload.create', '/studio')).rejects.toThrow(
      'REDIRECT:/',
    )
  })

  it('판정을 can() 에 맡긴다 (역할 문자열을 직접 비교하지 않는다)', async () => {
    // ADMIN 은 upload.create 를 가진다. 화면이 role === 'CREATOR' 로 비교하면
    // 관리자가 막힌다.
    mocks.cookieStore.set('authjs.session-token', 'tok_1')
    mocks.getSessionByToken.mockResolvedValue(session({ role: 'ADMIN' }))

    await expect(
      requireCapability('upload.create', '/studio'),
    ).resolves.toMatchObject({ userId: 'usr_1' })
  })
})
