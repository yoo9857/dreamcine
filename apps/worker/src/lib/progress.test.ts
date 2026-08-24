import { describe, expect, it, vi } from 'vitest'

import { createProgressReporter, type ProgressStore } from './progress.js'

function storeWith(set: ProgressStore['set']): ProgressStore {
  return { set }
}

describe('createProgressReporter', () => {
  it('5% 단위의 단조 증가만 24시간 TTL로 저장한다', async () => {
    const set = vi.fn<ProgressStore['set']>().mockResolvedValue('OK')
    const reporter = createProgressReporter(storeWith(set), 'asset_1')

    await reporter.report(1)
    await reporter.report(4.9)
    await reporter.report(5)
    await reporter.report(3)
    await reporter.report(12.9)
    await reporter.complete()

    expect(set.mock.calls).toEqual([
      ['asset:progress:asset_1', '0', 'EX', 86_400],
      ['asset:progress:asset_1', '5', 'EX', 86_400],
      ['asset:progress:asset_1', '10', 'EX', 86_400],
      ['asset:progress:asset_1', '100', 'EX', 86_400],
    ])
  })

  it('범위 밖 유한값은 0~100으로 제한한다', async () => {
    const set = vi.fn<ProgressStore['set']>().mockResolvedValue('OK')
    const reporter = createProgressReporter(storeWith(set), 'asset_2')

    await reporter.report(-10)
    await reporter.report(150)

    expect(set.mock.calls.map((call) => call[1])).toEqual(['0', '100'])
  })

  it('비정상 퍼센트를 거부한다', async () => {
    const set = vi.fn<ProgressStore['set']>().mockResolvedValue('OK')
    const reporter = createProgressReporter(storeWith(set), 'asset_3')

    await expect(reporter.report(Number.NaN)).rejects.toEqual(
      expect.objectContaining({ code: 'E_VALIDATION' }),
    )
    expect(set).not.toHaveBeenCalled()
  })

  it('Redis 실패를 큐 오류로 변환하고 다음 호출이 재시도하게 둔다', async () => {
    const set = vi
      .fn<ProgressStore['set']>()
      .mockRejectedValueOnce(new Error('redis down'))
      .mockResolvedValueOnce('OK')
    const reporter = createProgressReporter(storeWith(set), 'asset_4')

    await expect(reporter.report(5)).rejects.toEqual(
      expect.objectContaining({ code: 'E_QUEUE_UNAVAILABLE' }),
    )
    await reporter.report(5)
    expect(set).toHaveBeenCalledTimes(2)
  })
})
