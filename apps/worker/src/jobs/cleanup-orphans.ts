import { NotImplementedError } from '@aidream/core'

export interface CleanupOrphansInput {
  readonly scope: 'staleUploads' | 'orphanAssets' | 'failedOriginals'
  readonly now: Date
}

export interface CleanupResult {
  readonly examined: number
  readonly deleted: number
}

export function cleanupOrphans(
  input: CleanupOrphansInput,
): Promise<CleanupResult> {
  void input
  throw new NotImplementedError('T06:cleanupOrphans')
}
