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

function dependencies(assetIds: string[] = []) {
  return {
    applyDecision: vi.fn().mockResolvedValue({
      report: { ...report(), status: 'ACTIONED' },
      actionId: 'action1',
      assetIds,
    }),
    markQueued: vi.fn().mockResolvedValue({}),
    enqueueDelete: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReviewReportDependencies
}
describe('reviewReport', () => {
  it('commits a reasoned warning through the atomic repository', async () => {
    const deps = dependencies()
    await expect(
      reviewReport(
        session('MODERATOR'),
        'report_1',
        { action: 'WARN_USER', note: 'verified violation' },
        deps,
      ),
    ).resolves.toMatchObject({ status: 'ACTIONED' })
    expect(deps.applyDecision).toHaveBeenCalledWith({
      actorId: 'moderator',
      reportId: 'report_1',
      decision: { action: 'WARN_USER', note: 'verified violation' },
    })
  })
  it('rejects unauthorized removals before any write', async () => {
    const deps = dependencies()
    await expect(
      reviewReport(
        session('MODERATOR'),
        'report_1',
        { action: 'REMOVE_CONTENT', note: 'violation' },
        deps,
      ),
    ).rejects.toMatchObject({ code: 'E_PERM_DENIED' })
    expect(deps.applyDecision).not.toHaveBeenCalled()
  })
  it('requires an explicit suspension duration', async () => {
    const deps = dependencies()
    await expect(
      reviewReport(
        session('ADMIN'),
        'report_1',
        { action: 'SUSPEND_USER', note: 'violation' },
        deps,
      ),
    ).rejects.toMatchObject({ code: 'E_VALIDATION' })
    expect(deps.applyDecision).not.toHaveBeenCalled()
  })
  it('leaves durable cleanup pending on queue failure without undoing the decision', async () => {
    const deps = dependencies(['asset1'])
    vi.mocked(deps.enqueueDelete).mockRejectedValue(new Error('queue offline'))
    await expect(
      reviewReport(
        session('ADMIN'),
        'report_1',
        { action: 'REMOVE_CONTENT', note: 'violation' },
        deps,
      ),
    ).resolves.toMatchObject({ status: 'ACTIONED' })
    expect(deps.markQueued).not.toHaveBeenCalled()
  })
  it('acknowledges cleanup only after all jobs are queued', async () => {
    const deps = dependencies(['asset1', 'asset2'])
    await reviewReport(
      session('ADMIN'),
      'report_1',
      { action: 'REMOVE_CONTENT', note: 'violation' },
      deps,
    )
    expect(deps.enqueueDelete).toHaveBeenCalledTimes(2)
    expect(deps.markQueued).toHaveBeenCalledWith('action1')
  })
})
