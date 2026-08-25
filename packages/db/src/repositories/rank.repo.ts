import { Prisma } from '@prisma/client'

import { db } from '../client.js'
import { executeDb } from '../errors.js'

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
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return executeDb(async () => {
    const rows = await db.episode.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        publishedAt:
          scope === 'recent' ? { gt: cutoff, lte: now } : { lt: cutoff },
        ...(scope === 'expired' ? { rankScore: { not: 0 } } : {}),
      },
      orderBy: [{ publishedAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: {
        id: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        publishedAt: true,
      },
    })
    return rows.flatMap((row) =>
      row.publishedAt === null
        ? []
        : [
            {
              id: row.id,
              viewCount: row.viewCount.toString(),
              likeCount: row.likeCount,
              commentCount: row.commentCount,
              publishedAt: row.publishedAt,
            },
          ],
    )
  })
}

export function updateRankScores(
  updates: readonly RankScoreUpdate[],
): Promise<number> {
  if (updates.length === 0) return Promise.resolve(0)
  return executeDb(() =>
    db.$executeRaw(Prisma.sql`
      UPDATE episode AS e
      SET rank_score = scores.score, updated_at = now()
      FROM (VALUES ${Prisma.join(
        updates.map(
          (update) =>
            Prisma.sql`(${update.id}::text, ${update.score}::double precision)`,
        ),
      )}) AS scores(id, score)
      WHERE e.id = scores.id
    `),
  )
}
