export interface RankInput {
  readonly viewCount: number
  readonly likeCount: number
  readonly commentCount: number
  readonly publishedAt: Date
  readonly now: Date
}

export function rankScore(input: RankInput): number {
  const engagement =
    input.viewCount + input.likeCount * 8 + input.commentCount * 15
  const ageHours =
    (input.now.getTime() - input.publishedAt.getTime()) / 3_600_000

  return engagement / Math.pow(ageHours + 2, 1.5)
}
