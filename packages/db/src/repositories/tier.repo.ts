import type { MemberTier, UserRole } from '@aidream/core'
import { Prisma } from '@prisma/client'
import { db } from '../client.js'
import { executeDb } from '../errors.js'

export interface TierActivitySnapshot {
  readonly role: UserRole
  readonly tier: MemberTier
  readonly tierPoints: number
  readonly tierEvaluatedAt: Date | null
  readonly createdAt: Date
  readonly followerCount: number
  readonly totalViews: number
  readonly episodesPublished: number
  readonly watchSeconds: number
  readonly commentsPosted: number
  readonly likesGiven: number
}

/**
 * 등급 산정에 쓰는 실적을 한 사용자분만 모은다. 팔로워·조회는 카운터를,
 * 회차·시청·댓글·좋아요는 행을 직접 센다 — 회원 카운터에는 공개 회차 수가 없고,
 * 나머지는 카운터 자체가 없다.
 */
export function readTierActivity(
  userId: string,
): Promise<TierActivitySnapshot | null> {
  return executeDb(async () => {
    const user = await db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        role: true,
        tier: true,
        tierPoints: true,
        tierEvaluatedAt: true,
        createdAt: true,
        followerCount: true,
        totalViews: true,
      },
    })
    if (user === null) return null

    const [episodesPublished, watch, commentsPosted, likesGiven] =
      await Promise.all([
        db.episode.count({
          where: {
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            deletedAt: null,
            series: { ownerId: userId, deletedAt: null },
          },
        }),
        // 진행 기록은 "마지막 위치" 다. 다 본 회차는 길이만큼, 보던 회차는 위치만큼
        // 센다. 자기 작품 재생은 시청 실적이 아니다.
        db.$queryRaw<{ seconds: bigint | null }[]>(Prisma.sql`
          SELECT SUM(
            CASE WHEN wp.completed AND e.duration_sec IS NOT NULL
              THEN e.duration_sec ELSE wp.position_sec END
          )::bigint AS seconds
          FROM watch_progress wp
          JOIN episode e ON e.id = wp.episode_id
          JOIN series s ON s.id = e.series_id
          WHERE wp.user_id = ${userId} AND s.owner_id <> ${userId}
        `),
        db.comment.count({ where: { userId, deletedAt: null } }),
        db.like.count({ where: { userId } }),
      ])

    return {
      role: user.role,
      tier: user.tier,
      tierPoints: user.tierPoints,
      tierEvaluatedAt: user.tierEvaluatedAt,
      createdAt: user.createdAt,
      followerCount: user.followerCount,
      totalViews: Number(user.totalViews),
      episodesPublished,
      watchSeconds: Number(watch[0]?.seconds ?? 0),
      commentsPosted,
      likesGiven,
    }
  })
}
