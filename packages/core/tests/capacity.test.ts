import { describe, expect, it } from 'vitest'

import { CAPACITY_TIERS, loadCapacity } from '../src/capacity.js'

describe('loadCapacity', () => {
  it('현재 T0 프로필을 정확히 반환한다', () => {
    expect(loadCapacity('T0')).toEqual({
      uploadMaxBytes: 2 * 1024 ** 3,
      uploadDailyBytes: 10 * 1024 ** 3,
      uploadHourlyCount: 5,
      videoMaxDurationSec: 1200,
      ladder: ['720p', '360p'],
      workerConcurrency: 1,
      tmpDirMaxBytes: 8 * 1024 ** 3,
      feedCacheTtlSec: 120,
    })
  })

  it('T2는 T1보다 큰 임시공간을 갖고 나머지 정책은 같다', () => {
    const { tmpDirMaxBytes: t1Tmp, ...t1Policy } = CAPACITY_TIERS.T1
    const { tmpDirMaxBytes: t2Tmp, ...t2Policy } = CAPACITY_TIERS.T2

    expect(t2Policy).toEqual(t1Policy)
    expect(t1Tmp).toBe(40 * 1024 ** 3)
    expect(t2Tmp).toBe(80 * 1024 ** 3)
  })
})
