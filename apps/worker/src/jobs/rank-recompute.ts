import { NotImplementedError } from '@aidream/core'
import type { RankScope } from '@aidream/db'

export interface RankRecomputeInput {
  readonly scope: RankScope
  readonly now: Date
  readonly batchSize?: number
}

export interface RankRecomputeResult {
  readonly examined: number
  readonly updated: number
  readonly hasMore: boolean
}

export function rankRecompute(
  input: RankRecomputeInput,
): Promise<RankRecomputeResult> {
  void input
  throw new NotImplementedError('T09:rankRecomputeJob')
}
