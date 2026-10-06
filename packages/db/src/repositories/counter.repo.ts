import { withTransaction } from '../tx.js'

export interface CounterMismatch {
  readonly entity: 'episode' | 'user'
  readonly id: string
  readonly field: 'viewCount' | 'likeCount' | 'commentCount' | 'followerCount'
  readonly stored: string
  readonly actual: string
}

/**
 * 조회 버퍼를 반영한다. 회차·작품·작가의 조회 합계를 한 트랜잭션에서 함께 올린다.
 *
 * 예전에는 회차만 올렸다. `Series.totalViews` 와 `User.totalViews` 를 갱신하는
 * 곳이 아무 데도 없어서, 작품·작가 페이지는 회차에 조회가 쌓여도 늘 "조회 0" 이었다.
 * (기존 값은 마이그레이션 `20261006100000_backfill_total_views` 가 채웠다)
 */
export function incrementEpisodeViews(
  episodeId: string,
  by: bigint,
): Promise<void> {
  return withTransaction(async (tx) => {
    const episode = await tx.episode.update({
      where: { id: episodeId, deletedAt: null },
      data: { viewCount: { increment: by } },
      select: { seriesId: true, series: { select: { ownerId: true } } },
    })
    await tx.series.update({
      where: { id: episode.seriesId },
      data: { totalViews: { increment: by } },
    })
    await tx.user.update({
      where: { id: episode.series.ownerId },
      data: { totalViews: { increment: by } },
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
