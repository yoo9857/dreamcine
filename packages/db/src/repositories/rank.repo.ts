import { NotImplementedError } from '@aidream/core'

export type RankScope = 'recent' | 'expired'

export interface RankCandidate {
  readonly id: string
  readonly viewCount: string
  readonly likeCount: number
  readonly commentCount: number
  readonly publishedAt: Date
}

export interface RankScoreUpdate {
  readonly id: string
  readonly score: number
}

export function listRankCandidates(
  scope: RankScope,
  now: Date,
  limit: number,
): Promise<readonly RankCandidate[]> {
  void scope
  void now
  void limit
  throw new NotImplementedError('T09:rankRepoScan')
}

export function updateRankScores(
  updates: readonly RankScoreUpdate[],
): Promise<number> {
  void updates
  throw new NotImplementedError('T09:rankRepoUpdate')
}
