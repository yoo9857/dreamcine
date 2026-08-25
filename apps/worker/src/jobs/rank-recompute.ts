import { rankScore } from '@aidream/core'
import {
  listRankCandidates,
  type RankScope,
  updateRankScores,
} from '@aidream/db'

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

export interface RankRecomputeDependencies {
  readonly scan: typeof listRankCandidates
  readonly update: typeof updateRankScores
}

export function rankRecompute(
  input: RankRecomputeInput,
  dependencies: RankRecomputeDependencies = {
    scan: listRankCandidates,
    update: updateRankScores,
  },
): Promise<RankRecomputeResult> {
  return run(input, dependencies)
}

async function run(
  input: RankRecomputeInput,
  dependencies: RankRecomputeDependencies,
): Promise<RankRecomputeResult> {
  const batchSize = input.batchSize ?? 1000
  const candidates = await dependencies.scan(input.scope, input.now, batchSize)
  const updates = candidates.map((candidate) => ({
    id: candidate.id,
    score:
      input.scope === 'expired'
        ? 0
        : rankScore({
            viewCount: Number(candidate.viewCount),
            likeCount: candidate.likeCount,
            commentCount: candidate.commentCount,
            publishedAt: candidate.publishedAt,
            now: input.now,
          }),
  }))
  const updated = await dependencies.update(updates)
  return {
    examined: candidates.length,
    updated,
    hasMore: candidates.length === batchSize,
  }
}
