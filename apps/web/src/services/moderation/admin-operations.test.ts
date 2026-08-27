import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppError } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'

const repositories = vi.hoisted(() => ({
  findAssetById: vi.fn(),
  getUserDetailForAdmin: vi.fn(),
  listAssetsForAdmin: vi.fn(),
  listContentForAdmin: vi.fn(),
  listCreatorApplicationsForAdmin: vi.fn(),
  listRecentRoleGrants: vi.fn(),
  setUserRoleForAdmin: vi.fn().mockResolvedValue(undefined),
  updateAssetStatus: vi.fn(),
  updateCreatorApplicationStatus: vi.fn(),
}))

vi.mock('@aidream/db', () => repositories)
vi.mock('@aidream/queue', () => ({
  QUEUE: { VIDEO_TRANSCODE: 'video-transcode' },
  retryJob: vi.fn(),
}))

import { changeUserRole, getAdminUserDetail } from './admin-operations'

function session(role: 'MODERATOR' | 'ADMIN' = 'ADMIN'): RouteSession {
  return {
    userId: 'operator',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    user: {
      id: 'operator',
      handle: 'operator',
      email: 'operator@example.com',
      displayName: 'Operator',
      role,
      status: 'ACTIVE',
      emailVerified: true,
      tier: 'BRONZE',
      isVerified: false,
    },
  }
}

describe('changeUserRole', () => {
  beforeEach(() => {
    repositories.setUserRoleForAdmin.mockClear()
  })

  it('부여 가능한 역할과 감사 사유를 저장소에 전달한다', async () => {
    await changeUserRole(session(), 'user_1', 'CREATOR', '지원 승인')

    expect(repositories.setUserRoleForAdmin).toHaveBeenCalledWith({
      userId: 'user_1',
      role: 'CREATOR',
      grantedBy: 'operator',
      reason: '지원 승인',
    })
  })

  it('유도 역할 MEMBER의 직접 부여를 거부한다', async () => {
    await expect(
      changeUserRole(session(), 'user_1', 'MEMBER', '직접 부여'),
    ).rejects.toMatchObject({ code: 'E_VALIDATION' })
    expect(repositories.setUserRoleForAdmin).not.toHaveBeenCalled()
  })

  it('권한 없는 운영자와 자기 역할 변경을 거부한다', async () => {
    await expect(
      changeUserRole(session('MODERATOR'), 'user_1', 'CREATOR', '승인'),
    ).rejects.toMatchObject({ code: 'E_PERM_DENIED' })
    await expect(
      changeUserRole(session(), 'operator', 'VIEWER', '자기 강등'),
    ).rejects.toMatchObject({ code: 'E_PERM_DENIED' })
    expect(repositories.setUserRoleForAdmin).not.toHaveBeenCalled()
  })
})

describe('getAdminUserDetail', () => {
  beforeEach(() => {
    repositories.getUserDetailForAdmin.mockReset()
  })

  it('관리자 요청을 회원 상세 저장소에 전달한다', async () => {
    const detail = { user: { id: 'user_1' }, counts: { sessions: 2 } }
    repositories.getUserDetailForAdmin.mockResolvedValue(detail)

    await expect(getAdminUserDetail(session(), 'user_1')).resolves.toBe(detail)
    expect(repositories.getUserDetailForAdmin).toHaveBeenCalledWith('user_1')
  })

  it('관리자가 아니면 회원 상세 조회를 거부한다', () => {
    expect(() =>
      getAdminUserDetail(session('MODERATOR'), 'user_1'),
    ).toThrowError(AppError)
    expect(repositories.getUserDetailForAdmin).not.toHaveBeenCalled()
  })
})
