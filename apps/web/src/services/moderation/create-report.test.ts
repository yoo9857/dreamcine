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
      autoHidden: false,
    }),
    ...overrides,
  } as unknown as CreateReportDependencies
}

describe('createReport', () => {
  it('accepts a valid report as OPEN', async () => {
    const deps = dependencies()
    await expect(
      createReport(
        session,
        { target: 'EPISODE', targetId: 'episode_1', reason: 'OTHER' },
        deps,
      ),
    ).resolves.toMatchObject({ status: 'OPEN' })
    expect(deps.insert).toHaveBeenCalledOnce()
  })
  it('rejects self reports and duplicate reports', async () => {
    await expect(
      createReport(
        session,
        { target: 'EPISODE', targetId: 'episode_1', reason: 'OTHER' },
        dependencies({
          findTarget: vi
            .fn()
            .mockResolvedValue({ ownerId: 'reporter', createdAt: new Date() }),
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
  it('prioritizes urgent reports without changing visibility', async () => {
    const deps = dependencies({
      insert: vi.fn().mockResolvedValue(report('MINOR_SAFETY')),
    })
    const result = await createReport(
      session,
      { target: 'EPISODE', targetId: 'episode_1', reason: 'MINOR_SAFETY' },
      deps,
    )
    expect(deps.setAutomaticState).toHaveBeenCalledWith('report_1', {
      priorityFlag: true,
    })
    expect(result.autoHidden).toBe(false)
  })
  it('preserves submitted report when priority flag write fails', async () => {
    const deps = dependencies({
      insert: vi.fn().mockResolvedValue(report('MINOR_SAFETY')),
      setAutomaticState: vi.fn().mockRejectedValue(new Error('db down')),
    })
    await expect(
      createReport(
        session,
        { target: 'EPISODE', targetId: 'episode_1', reason: 'MINOR_SAFETY' },
        deps,
      ),
    ).resolves.toMatchObject({ id: 'report_1', autoHidden: false })
  })
})
