import type { User } from '@aidream/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('@aidream/db', () => ({
  findUserById: mocks.findUser,
  updateUser: mocks.updateUser,
}))
vi.mock('@aidream/storage', () => ({
  avatarUrl: (key: string | null) =>
    key === null ? null : `https://cdn.example/${key}`,
}))

const { getMe, toMeResult } = await import('./get-me.js')
const { updateMe } = await import('./update-me.js')

const NOW = new Date('2026-08-24T00:00:00.000Z')
const USER: User = {
  id: 'user_1',
  handle: 'creator',
  email: 'creator@example.com',
  emailVerified: NOW,
  passwordHash: 'hash',
  displayName: 'Creator',
  bio: null,
  avatarKey: 'avatars/user_1.webp',
  role: 'CREATOR',
  status: 'ACTIVE',
  followerCount: 0,
  seriesCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
}

beforeEach(() => {
  mocks.findUser.mockReset().mockResolvedValue(USER)
  mocks.updateUser
    .mockReset()
    .mockImplementation((_id: string, patch: Partial<User>) =>
      Promise.resolve({ ...USER, ...patch }),
    )
})

describe('getMe', () => {
  it('도메인 사용자를 API 응답으로 변환한다', async () => {
    expect(toMeResult(USER)).toMatchObject({
      id: USER.id,
      avatarUrl: 'https://cdn.example/avatars/user_1.webp',
      emailVerified: NOW.toISOString(),
      createdAt: NOW.toISOString(),
    })
    await expect(getMe(USER.id)).resolves.toMatchObject({ id: USER.id })
  })

  it('없는 사용자를 거부하고 nullable 필드를 보존한다', async () => {
    expect(
      toMeResult({ ...USER, avatarKey: null, emailVerified: null }),
    ).toMatchObject({ avatarUrl: null, emailVerified: null })
    mocks.findUser.mockResolvedValue(null)
    await expect(getMe('missing')).rejects.toMatchObject({
      code: 'E_USER_NOT_FOUND',
    })
  })
})

describe('updateMe', () => {
  it('제공한 필드만 갱신한다', async () => {
    await expect(
      updateMe(USER.id, {
        displayName: 'New name',
        bio: 'New bio',
        avatarKey: null,
      }),
    ).resolves.toMatchObject({
      displayName: 'New name',
      bio: 'New bio',
      avatarUrl: null,
    })
    expect(mocks.updateUser).toHaveBeenCalledWith(USER.id, {
      displayName: 'New name',
      bio: 'New bio',
      avatarKey: null,
    })
  })

  it('빈 패치는 DB 쓰기 없이 현재 값을 반환한다', async () => {
    await expect(updateMe(USER.id, {})).resolves.toMatchObject({ id: USER.id })
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('없는 사용자를 거부한다', async () => {
    mocks.findUser.mockResolvedValue(null)
    await expect(updateMe('missing', { bio: null })).rejects.toMatchObject({
      code: 'E_USER_NOT_FOUND',
    })
  })
})
