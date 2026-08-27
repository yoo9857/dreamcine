import type { Report } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'

import { reviewReport, type ReviewReportDependencies } from './review-report'

function session(role: 'MODERATOR' | 'ADMIN'): RouteSession {
  return {
    userId: role.toLowerCase(),
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    user: {
      id: role.toLowerCase(),
      handle: role.toLowerCase(),
      email: `${role.toLowerCase()}@example.com`,
      displayName: role,
      role,
      status: 'ACTIVE',
      emailVerified: true,
      tier: 'BRONZE',
      isVerified: false,
    },
  }
}

function report(autoHidden = false): Report {
  return {
    id: 'report_1',
    reporterId: 'viewer',
    target: 'EPISODE',
    targetId: 'episode_1',
    reason: 'OTHER',
    detail: null,
    status: 'REVIEWING',
    priorityFlag: autoHidden,
    autoHidden,
    handledBy: null,
    handledAt: null,
    actionNote: null,
    createdAt: new Date(),
  }
}

function dependencies(autoHidden = false) {
  const selected = report(autoHidden)
  return {
    claim: vi.fn().mockResolvedValue(selected),
    findTarget: vi
      .fn()
      .mockResolvedValue({ ownerId: 'owner', createdAt: new Date() }),
    setHidden: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(['asset_1']),
    resolve: vi.fn().mockResolvedValue({
      ...selected,
      status: 'ACTIONED',
      handledBy: 'operator',
      handledAt: new Date(),
    }),
    suspend: vi.fn().mockResolvedValue(undefined),
    notify: vi.fn().mockResolvedValue(undefined),
    enqueueDelete: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReviewReportDependencies
}

describe('reviewReport', () => {
  it('MODERATOR는 콘텐츠를 숨기고 신고 묶음을 처리한다', async () => {
    const deps = dependencies()
    await expect(
      reviewReport(
        session('MODERATOR'),
        'report_1',
        { action: 'HIDE_CONTENT' },
        deps,
      ),
    ).resolves.toMatchObject({ status: 'ACTIONED' })
    expect(deps.setHidden).toHaveBeenCalledWith('EPISODE', 'episode_1', true)
    expect(deps.resolve).toHaveBeenCalledOnce()
  })

  it('MODERATOR의 영구 삭제와 계정 정지를 거부한다', async () => {
    const deps = dependencies()
    await expect(
      reviewReport(
        session('MODERATOR'),
        'report_1',
        { action: 'REMOVE_CONTENT' },
        deps,
      ),
    ).rejects.toMatchObject({ code: 'E_PERM_DENIED' })
    expect(deps.claim).not.toHaveBeenCalled()
  })

  it('REJECT는 자동 숨김만 되돌린다', async () => {
    const deps = dependencies(true)
    await reviewReport(
      session('MODERATOR'),
      'report_1',
      { action: 'REJECT' },
      deps,
    )
    expect(deps.setHidden).toHaveBeenCalledWith('EPISODE', 'episode_1', false)
    expect(deps.resolve).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REJECTED' }),
    )
  })

  it('ADMIN 영구 삭제는 미디어 삭제 잡을 발행한다', async () => {
    const deps = dependencies()
    await reviewReport(
      session('ADMIN'),
      'report_1',
      { action: 'REMOVE_CONTENT' },
      deps,
    )
    expect(deps.enqueueDelete).toHaveBeenCalledWith('asset_1')
  })
})
