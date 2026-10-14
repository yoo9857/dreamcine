import { AppError } from '@aidream/core'
import { db } from '../client.js'
import { executeDb } from '../errors.js'
import { withTransaction, type TransactionClient } from '../tx.js'

export interface CounterMismatch {
  readonly entity: 'episode' | 'user'
  readonly id: string
  readonly field: 'viewCount' | 'likeCount' | 'commentCount' | 'followerCount'
  readonly stored: string
  readonly actual: string
}

const RECONCILE_BATCH = 100

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
  return withTransaction((tx) => addEpisodeViews(tx, episodeId, by))
}

/**
 * Redis에서 빼 둔 조회 청구를 한 번만 반영한다.
 * 같은 토큰이 이미 있으면 합계를 올리지 않는다.
 */
export async function applyClaimedEpisodeViews(input: {
  readonly token: string
  readonly episodeId: string
  readonly amount: bigint
}): Promise<'applied' | 'duplicate'> {
  if (input.amount <= 0n) throw new AppError('E_VALIDATION')
  return await withTransaction(async (tx) => {
    const inserted = await tx.viewFlushReceipt.createMany({
      data: [
        {
          id: input.token,
          episodeId: input.episodeId,
          amount: input.amount,
        },
      ],
      skipDuplicates: true,
    })
    if (inserted.count === 0) return 'duplicate'
    await addEpisodeViews(tx, input.episodeId, input.amount)
    return 'applied'
  })
}

/** 반영이 끝난 영수증만 지운다. 호출 쪽은 대기 중인 청구를 먼저 처리한다. */
export function purgeViewFlushReceiptsOlderThan(
  olderThan: Date,
): Promise<number> {
  return executeDb(async () => {
    const result = await db.viewFlushReceipt.deleteMany({
      where: { createdAt: { lt: olderThan } },
    })
    return result.count
  })
}

async function addEpisodeViews(
  tx: TransactionClient,
  episodeId: string,
  by: bigint,
): Promise<void> {
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
}

/**
 * 최근 바뀐 회차·회원의 좋아요·댓글·팔로워 수를 실제 행 수에 맞춘다.
 *
 * 고치는 즉시 `updatedAt` 이 바뀌므로 그 시각으로 자르면 같은 행을 다시 보거나
 * 빠뜨릴 수 있다. id 순으로 100건씩 나누고, 배치마다 트랜잭션을 닫는다.
 */
export async function reconcileRecentCounters(
  changedSince: Date,
): Promise<readonly CounterMismatch[]> {
  const episodes = await reconcileEpisodes(changedSince)
  const users = await reconcileUsers(changedSince)
  return [...episodes, ...users]
}

async function reconcileEpisodes(
  changedSince: Date,
): Promise<CounterMismatch[]> {
  const mismatches: CounterMismatch[] = []
  let cursor: string | null = null
  for (;;) {
    const batch = await reconcileEpisodeBatch(changedSince, cursor)
    mismatches.push(...batch.found)
    if (batch.lastId === undefined || batch.count < RECONCILE_BATCH) break
    cursor = batch.lastId
  }
  return mismatches
}

function reconcileEpisodeBatch(
  changedSince: Date,
  cursor: string | null,
): Promise<{
  count: number
  lastId: string | undefined
  found: CounterMismatch[]
}> {
  return withTransaction(async (tx) => {
    const rows = await tx.episode.findMany({
      where: {
        updatedAt: { gte: changedSince },
        deletedAt: null,
        ...(cursor === null ? {} : { id: { gt: cursor } }),
      },
      orderBy: { id: 'asc' },
      take: RECONCILE_BATCH,
      select: {
        id: true,
        likeCount: true,
        commentCount: true,
        _count: {
          select: {
            likes: true,
            comments: { where: { deletedAt: null } },
          },
        },
      },
    })
    const found: CounterMismatch[] = []
    for (const episode of rows) {
      const likeDiffers = episode.likeCount !== episode._count.likes
      const commentDiffers = episode.commentCount !== episode._count.comments
      if (likeDiffers) {
        found.push({
          entity: 'episode',
          id: episode.id,
          field: 'likeCount',
          stored: String(episode.likeCount),
          actual: String(episode._count.likes),
        })
      }
      if (commentDiffers) {
        found.push({
          entity: 'episode',
          id: episode.id,
          field: 'commentCount',
          stored: String(episode.commentCount),
          actual: String(episode._count.comments),
        })
      }
      if (likeDiffers || commentDiffers) {
        await tx.episode.update({
          where: { id: episode.id },
          data: {
            likeCount: episode._count.likes,
            commentCount: episode._count.comments,
          },
        })
      }
    }
    const last = rows[rows.length - 1]
    return {
      count: rows.length,
      lastId: last === undefined ? undefined : last.id,
      found,
    }
  })
}

async function reconcileUsers(changedSince: Date): Promise<CounterMismatch[]> {
  const mismatches: CounterMismatch[] = []
  let cursor: string | null = null
  for (;;) {
    const batch = await reconcileUserBatch(changedSince, cursor)
    mismatches.push(...batch.found)
    if (batch.lastId === undefined || batch.count < RECONCILE_BATCH) break
    cursor = batch.lastId
  }
  return mismatches
}

function reconcileUserBatch(
  changedSince: Date,
  cursor: string | null,
): Promise<{
  count: number
  lastId: string | undefined
  found: CounterMismatch[]
}> {
  return withTransaction(async (tx) => {
    const rows = await tx.user.findMany({
      where: {
        updatedAt: { gte: changedSince },
        deletedAt: null,
        ...(cursor === null ? {} : { id: { gt: cursor } }),
      },
      orderBy: { id: 'asc' },
      take: RECONCILE_BATCH,
      select: {
        id: true,
        followerCount: true,
        _count: { select: { followers: true } },
      },
    })
    const found: CounterMismatch[] = []
    for (const user of rows) {
      if (user.followerCount === user._count.followers) continue
      found.push({
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
    const last = rows[rows.length - 1]
    return {
      count: rows.length,
      lastId: last === undefined ? undefined : last.id,
      found,
    }
  })
}
