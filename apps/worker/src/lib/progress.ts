import { NotImplementedError } from '@aidream/core'

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
  void store
  void assetId
  throw new NotImplementedError('T06:progressReport')
}
