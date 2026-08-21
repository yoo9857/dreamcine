export const CAPACITY_TIERS = {
  T0: {
    uploadMaxBytes: 2 * 1024 ** 3,
    uploadDailyBytes: 10 * 1024 ** 3,
    uploadHourlyCount: 5,
    videoMaxDurationSec: 1200,
    ladder: ['720p', '360p'],
    workerConcurrency: 1,
    tmpDirMaxBytes: 8 * 1024 ** 3,
    feedCacheTtlSec: 120,
  },
  T1: {
    uploadMaxBytes: 8 * 1024 ** 3,
    uploadDailyBytes: 50 * 1024 ** 3,
    uploadHourlyCount: 20,
    videoMaxDurationSec: 5400,
    ladder: ['1080p', '720p', '480p', '360p'],
    workerConcurrency: 2,
    tmpDirMaxBytes: 40 * 1024 ** 3,
    feedCacheTtlSec: 60,
  },
  T2: {
    uploadMaxBytes: 8 * 1024 ** 3,
    uploadDailyBytes: 50 * 1024 ** 3,
    uploadHourlyCount: 20,
    videoMaxDurationSec: 5400,
    ladder: ['1080p', '720p', '480p', '360p'],
    workerConcurrency: 2,
    tmpDirMaxBytes: 80 * 1024 ** 3,
    feedCacheTtlSec: 60,
  },
} as const

export type CapacityTier = keyof typeof CAPACITY_TIERS
export type Capacity = (typeof CAPACITY_TIERS)[CapacityTier]

export function loadCapacity(tier: CapacityTier): Capacity {
  return CAPACITY_TIERS[tier]
}
