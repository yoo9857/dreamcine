import { AppError } from '@aidream/core'
import { purgeExpiredData } from '@aidream/db'

export interface DbPurgeInput {
  readonly dryRun: boolean
  readonly now: Date
  readonly limit?: number
}

export interface DbPurgeResult {
  readonly candidates: number
  readonly deleted: number
}

export interface DbPurgeDependencies {
  readonly purge: (input: {
    now: Date
    dryRun: boolean
    limit: number
  }) => Promise<DbPurgeResult>
}

export function purgeDatabase(
  input: DbPurgeInput,
  dependencies: DbPurgeDependencies = { purge: purgeExpiredData },
): Promise<DbPurgeResult> {
  const limit = input.limit ?? 1000
  if (!Number.isInteger(limit) || limit <= 0 || limit > 1000) {
    throw new AppError('E_VALIDATION', { field: 'limit' })
  }
  return dependencies.purge({
    now: input.now,
    dryRun: input.dryRun,
    limit,
  })
}
