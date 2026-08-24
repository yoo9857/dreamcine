import { AppError } from '@aidream/core'

export interface ProgressStore {
  set(key: string, value: string, mode: 'EX', ttlSec: number): Promise<unknown>
}

export interface ProgressReporter {
  report(percent: number): Promise<void>
  complete(): Promise<void>
}

export function createProgressReporter(
  store: ProgressStore,
  assetId: string,
): ProgressReporter {
  if (!/^[A-Za-z0-9_-]+$/u.test(assetId)) {
    throw new AppError('E_VALIDATION', { field: 'assetId' })
  }
  const key = `asset:progress:${assetId}`
  let lastReported = -5

  const write = async (percent: number): Promise<void> => {
    if (!Number.isFinite(percent)) {
      throw new AppError('E_VALIDATION', { field: 'percent' })
    }
    const bucket = Math.floor(Math.min(100, Math.max(0, percent)) / 5) * 5
    if (bucket <= lastReported) return
    try {
      await store.set(key, String(bucket), 'EX', 86_400)
      lastReported = bucket
    } catch (error: unknown) {
      throw new AppError('E_QUEUE_UNAVAILABLE', undefined, error)
    }
  }

  return {
    report: write,
    complete: () => write(100),
  }
}
