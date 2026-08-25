import { NotImplementedError } from '../errors/not-implemented.js'

export interface RankInput {
  readonly viewCount: number
  readonly likeCount: number
  readonly commentCount: number
  readonly publishedAt: Date
  readonly now: Date
}

export function rankScore(input: RankInput): number {
  void input
  throw new NotImplementedError('T09:rankScore')
}
