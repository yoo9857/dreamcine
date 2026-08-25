import { db } from '../client.js'
import { executeDb } from '../errors.js'
import { withTransaction } from '../tx.js'

export interface CounterMismatch {
  readonly entity: 'episode' | 'user'
  readonly id: string
  readonly field: 'viewCount' | 'likeCount' | 'commentCount' | 'followerCount'
  readonly stored: string
  readonly actual: string
}

export function incrementEpisodeViews(
  episodeId: string,
  by: bigint,
): Promise<void> {
  return executeDb(async () => {
    await db.episode.update({
      where: { id: episodeId, deletedAt: null },
      data: { viewCount: { increment: by } },
    })
  })
}

export function reconcileRecentCounters(
  changedSince: Date,
): Promise<readonly CounterMismatch[]> {
  return withTransaction(async (tx) => {
    const [episodes, users] = await Promise.all([
      tx.episode.findMany({
        where: { updatedAt: { gte: changedSince }, deletedAt: null },
        select: {
          id: true,
          likeCount: true,
          commentCount: true,
          _count: {
            select: { likes: true, comments: { where: { deletedAt: null } } },
          },
        },
      }),
      tx.user.findMany({
        where: { updatedAt: { gte: changedSince }, deletedAt: null },
        select: {
          id: true,
          followerCount: true,
          _count: { select: { followers: true } },
        },
      }),
    ])
    const mismatches: CounterMismatch[] = []
    for (const episode of episodes) {
      if (episode.likeCount !== episode._count.likes) {
        mismatches.push({
          entity: 'episode',
          id: episode.id,
          field: 'likeCount',
          stored: String(episode.likeCount),
          actual: String(episode._count.likes),
        })
      }
      if (episode.commentCount !== episode._count.comments) {
        mismatches.push({
          entity: 'episode',
          id: episode.id,
          field: 'commentCount',
          stored: String(episode.commentCount),
          actual: String(episode._count.comments),
        })
      }
      if (
        episode.likeCount !== episode._count.likes ||
        episode.commentCount !== episode._count.comments
      ) {
        await tx.episode.update({
          where: { id: episode.id },
          data: {
            likeCount: episode._count.likes,
            commentCount: episode._count.comments,
          },
        })
      }
    }
    for (const user of users) {
      if (user.followerCount === user._count.followers) continue
      mismatches.push({
        entity: 'user',
        id: user.id,
        field: 'followerCount',
        stored: String(user.followerCount),
        actual: String(user._count.followers),
      })
      await tx.user.update({
        where: { id: user.id },
        data: { followerCount: user._count.followers },
      })
    }
    return mismatches
  })
}
