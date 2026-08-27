import type { Report } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'

import { createReport, type CreateReportDependencies } from './create-report'

const session: RouteSession = {
  userId: 'reporter',
  expiresAt: new Date('2030-01-01T00:00:00Z'),
  user: {
    id: 'reporter',
    handle: 'reporter',
    email: 'r@example.com',
    displayName: 'Reporter',
    role: 'VIEWER',
    status: 'ACTIVE',
    emailVerified: true,
    tier: 'BRONZE',
    isVerified: false,
  },
}

function report(reason: Report['reason'] = 'OTHER'): Report {
  return {
    id: 'report_1',
    reporterId: 'reporter',
    target: 'EPISODE',
    targetId: 'episode_1',
    reason,
    detail: null,
    status: 'OPEN',
    priorityFlag: false,
    autoHidden: false,
    handledBy: null,
    handledAt: null,
    actionNote: null,
    createdAt: new Date(),
  }
}

function dependencies(overrides: Partial<CreateReportDependencies> = {}) {
  return {
    findTarget: vi.fn().mockResolvedValue({
      ownerId: 'owner',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }),
    findDuplicate: vi.fn().mockResolvedValue(null),
    insert: vi.fn().mockResolvedValue(report()),
    stats: vi.fn().mockResolvedValue({ reportCount: 1, distinctReporters: 1 }),
    setAutomaticState: vi.fn().mockResolvedValue({
      ...report(),
      priorityFlag: true,
      autoHidden: true,
    }),
    setHidden: vi.fn().mockResolvedValue(undefined),
    notify: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as CreateReportDependencies
}

describe('createReport', () => {
  it('정상 신고를 OPEN으로 접수한다', async () => {
    const deps = dependencies()
    await expect(
      createReport(
        session,
        { target: 'EPISODE', targetId: 'episode_1', reason: 'OTHER' },
        deps,
      ),
    ).resolves.toMatchObject({ id: 'report_1', status: 'OPEN' })
    expect(deps.insert).toHaveBeenCalledOnce()
  })

  it('자기 콘텐츠와 중복 신고를 거부한다', async () => {
    await expect(
      createReport(
        session,
        { target: 'EPISODE', targetId: 'episode_1', reason: 'OTHER' },
        dependencies({
          findTarget: vi.fn().mockResolvedValue({
            ownerId: 'reporter',
            createdAt: new Date(),
          }),
        }),
      ),
    ).rejects.toMatchObject({ code: 'E_USER_SELF_ACTION' })

    await expect(
      createReport(
        session,
        { target: 'EPISODE', targetId: 'episode_1', reason: 'OTHER' },
        dependencies({ findDuplicate: vi.fn().mockResolvedValue(report()) }),
      ),
    ).rejects.toMatchObject({ code: 'E_REPORT_DUPLICATE' })
  })

  it('아동 안전 신고는 즉시 숨기고 소유자에게 알린다', async () => {
    const deps = dependencies({
      insert: vi.fn().mockResolvedValue(report('MINOR_SAFETY')),
    })
    const result = await createReport(
      session,
      {
        target: 'EPISODE',
        targetId: 'episode_1',
        reason: 'MINOR_SAFETY',
      },
      deps,
    )
    expect(deps.setHidden).toHaveBeenCalledWith('EPISODE', 'episode_1', true)
    expect(deps.setAutomaticState).toHaveBeenCalledWith('report_1', {
      priorityFlag: true,
      autoHidden: true,
    })
    expect(deps.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MODERATION', action: 'AUTO_HIDE' }),
    )
    expect(result.autoHidden).toBe(true)
  })

  it('자동 상태 저장 실패는 숨김을 되돌리되 신고 접수는 유지한다', async () => {
    const deps = dependencies({
      insert: vi.fn().mockResolvedValue(report('MINOR_SAFETY')),
      setAutomaticState: vi.fn().mockRejectedValue(new Error('db down')),
    })
    await expect(
      createReport(
        session,
        {
          target: 'EPISODE',
          targetId: 'episode_1',
          reason: 'MINOR_SAFETY',
        },
        deps,
      ),
    ).resolves.toMatchObject({ id: 'report_1', autoHidden: false })
    expect(deps.setHidden).toHaveBeenNthCalledWith(
      2,
      'EPISODE',
      'episode_1',
      false,
    )
  })

  it('알림 실패는 완료된 자동 숨김을 되돌리지 않는다', async () => {
    const deps = dependencies({
      insert: vi.fn().mockResolvedValue(report('MINOR_SAFETY')),
      notify: vi.fn().mockRejectedValue(new Error('queue down')),
    })
    await expect(
      createReport(
        session,
        {
          target: 'EPISODE',
          targetId: 'episode_1',
          reason: 'MINOR_SAFETY',
        },
        deps,
      ),
    ).resolves.toMatchObject({ autoHidden: true })
    expect(deps.setHidden).toHaveBeenCalledTimes(1)
  })
})
