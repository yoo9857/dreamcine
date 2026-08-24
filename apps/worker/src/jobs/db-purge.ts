import { NotImplementedError } from '@aidream/core'

export interface DbPurgeInput {
  readonly dryRun: boolean
  readonly now: Date
  readonly limit?: number
}

export interface DbPurgeResult {
  readonly candidates: number
  readonly deleted: number
}

export function purgeDatabase(input: DbPurgeInput): Promise<DbPurgeResult> {
  void input
  throw new NotImplementedError('T06:dbPurge')
}
