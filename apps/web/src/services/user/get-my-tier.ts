import {
  AppError,
  evaluateTier,
  tierPointBreakdown,
  TIER_THRESHOLDS,
  type MemberTier,
  type TierCategoryScore,
  type UserRole,
} from '@aidream/core'
import { readTierActivity } from '@aidream/db'

const DAY_MS = 86_400_000

export interface MyTier {
  readonly role: UserRole
  /** 저장된 등급. 업로드 배분 등 혜택은 이 값으로 적용된다 */
  readonly appliedTier: MemberTier
  /** 지금 실적으로 산정한 점수와 등급. 다음 정기 평가에서 반영될 값이다 */
  readonly points: number
  readonly computedTier: MemberTier
  readonly nextTier: MemberTier | null
  readonly pointsToNext: number | null
  /** 산정 등급 하한부터 다음 등급 하한까지 채운 비율 (0~1). 최상위면 1 */
  readonly progress: number
  readonly breakdown: readonly TierCategoryScore[]
  /** 저장된 등급이 마지막으로 평가된 시각. 평가된 적 없으면 null */
  readonly evaluatedAt: string | null
  readonly computedAt: string
}

export interface GetMyTierDependencies {
  readonly read: typeof readTierActivity
  readonly now: () => Date
}

function minPointsOf(tier: MemberTier): number {
  return TIER_THRESHOLDS.find((entry) => entry.tier === tier)?.minPoints ?? 0
}

/**
 * 내 등급과 지금 실적 기준 점수.
 *
 * **읽기만 한다.** 등급의 진실은 `tier.reevaluate` 배치다
 * (04_DOMAIN_MODEL 카운터 표). 화면을 열었다는 이유로 등급이 오르내리면
 * 같은 실적의 두 회원이 "페이지를 열었는가" 로 다른 혜택을 받는다. 그래서
 * 적용 등급과 산정 등급을 나눠 내려주고, 둘이 다르면 화면이 그렇게 말한다.
 */
export async function getMyTier(
  userId: string,
  dependencies: GetMyTierDependencies = {
    read: readTierActivity,
    now: () => new Date(),
  },
): Promise<MyTier> {
  const snapshot = await dependencies.read(userId)
  if (snapshot === null) throw new AppError('E_USER_NOT_FOUND')

  const now = dependencies.now()
  const activity = {
    followerCount: snapshot.followerCount,
    episodesPublished: snapshot.episodesPublished,
    totalViews: snapshot.totalViews,
    accountAgeDays: Math.floor(
      (now.getTime() - snapshot.createdAt.getTime()) / DAY_MS,
    ),
    watchSeconds: snapshot.watchSeconds,
    commentsPosted: snapshot.commentsPosted,
    likesGiven: snapshot.likesGiven,
  }
  const evaluation = evaluateTier(activity, snapshot.tier)

  const floor = minPointsOf(evaluation.tier)
  const ceiling =
    evaluation.nextTier === null ? null : minPointsOf(evaluation.nextTier)
  const progress =
    ceiling === null
      ? 1
      : Math.min(
          1,
          Math.max(0, (evaluation.points - floor) / (ceiling - floor)),
        )

  return {
    role: snapshot.role,
    appliedTier: snapshot.tier,
    points: evaluation.points,
    computedTier: evaluation.tier,
    nextTier: evaluation.nextTier,
    pointsToNext: evaluation.pointsToNext,
    progress,
    breakdown: tierPointBreakdown(activity),
    evaluatedAt: snapshot.tierEvaluatedAt?.toISOString() ?? null,
    computedAt: now.toISOString(),
  }
}
