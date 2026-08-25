import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  registerFeedRankSchedules,
  registerSocialSchedules,
  startScheduler,
  type SchedulerDependencies,
} from './scheduler.js'

afterEach(() => {
  vi.useRealTimers()
})

function dependencies(leader: boolean): SchedulerDependencies {
  return {
    acquire: vi.fn().mockResolvedValue(leader),
    register: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
  }
}

describe('startScheduler', () => {
  it('리더만 반복 잡을 등록하고 종료 시 락을 해제한다', async () => {
    const deps = dependencies(true)
    const handle = await startScheduler(undefined, deps)

    expect(deps.register).toHaveBeenCalledOnce()
    await handle.close()
    await handle.close()
    expect(deps.release).toHaveBeenCalledOnce()
  })

  it('팔로워는 등록도 락 해제도 하지 않는다', async () => {
    vi.useFakeTimers()
    const deps = dependencies(false)
    const handle = await startScheduler(undefined, deps)

    expect(deps.register).not.toHaveBeenCalled()
    await handle.close()
    expect(deps.release).not.toHaveBeenCalled()
  })

  it('리더 락을 갱신하고 abort 신호에서 한 번만 정리한다', async () => {
    vi.useFakeTimers()
    const deps = dependencies(true)
    const controller = new AbortController()
    const handle = await startScheduler(controller.signal, deps)

    await vi.advanceTimersByTimeAsync(10_000)
    expect(deps.refresh).toHaveBeenCalledOnce()

    controller.abort()
    await vi.waitFor(() => {
      expect(deps.release).toHaveBeenCalledOnce()
    })
    await handle.close()
    expect(deps.release).toHaveBeenCalledOnce()
  })

  it('팔로워가 주기적으로 재시도해 리더가 되면 한 번만 등록한다', async () => {
    vi.useFakeTimers()
    const deps = dependencies(false)
    vi.mocked(deps.acquire)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    const handle = await startScheduler(undefined, deps)

    await vi.advanceTimersByTimeAsync(10_000)
    expect(deps.acquire).toHaveBeenCalledTimes(2)
    expect(deps.register).toHaveBeenCalledOnce()
    await handle.close()
    expect(deps.release).toHaveBeenCalledOnce()
  })
})

describe('registerFeedRankSchedules', () => {
  it('최근 점수는 10분, 만료 점수는 하루 주기로 고유 등록한다', async () => {
    const register = vi.fn().mockResolvedValue(undefined)

    await registerFeedRankSchedules({ register })

    expect(register.mock.calls).toEqual([
      ['feed-rank-recent-every-ten-minutes', 600_000, { scope: 'recent' }],
      ['feed-rank-expired-daily', 86_400_000, { scope: 'expired' }],
    ])
  })
})

describe('registerSocialSchedules', () => {
  it('registers minute flush and daily 04:00 reconciliation', async () => {
    const register = vi.fn().mockResolvedValue(undefined)

    await registerSocialSchedules({ register })

    expect(register.mock.calls).toEqual([
      ['counter.flush', 'counter-flush-every-minute', { every: 60_000 }, {}],
      [
        'counter.reconcile',
        'counter-reconcile-daily-at-four',
        { pattern: '0 4 * * *' },
        { changedSinceDays: 7 },
      ],
    ])
  })
})
