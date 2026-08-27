import type { MemberTier } from '../enums.js'

/**
 * 등급 점수 가중치와 상한.
 *
 * 상한이 있는 이유: 상한 없는 항목 하나가 나머지를 무의미하게 만든다. 조회수
 * 1억인 채널이 시청·참여 점수를 아무리 0으로 두어도 DIAMOND 인 구조는 등급을
 * "조회수의 다른 이름" 으로 만든다.
 *
 * **이 값은 `prisma/migrations/20260827010000_t16_role_tiers/migration.sql` 의
 * 백필 계산과 같아야 한다.** 한쪽만 바꾸면 배치가 처음 돌기 전까지 등급이
 * 어긋난다. (백필은 저장된 컬럼만 쓰므로 시청·댓글·좋아요 항목은 0으로 본다)
 *
 * 상한은 `TIER_CATEGORY_MAX` 의 불변식에 묶여 있다 — 가중치나 상한을 바꾸면
 * 그 표도 함께 바꿔야 하고, 테스트가 어긋남을 잡는다.
 */
export const TIER_WEIGHTS = {
  /** 팔로워 1명 = 1점. 최대 50,000점 */
  followerCount: { weight: 1, cap: 50_000 },
  /** 공개 회차 1편 = 40점. 제작이 소비보다 무겁다. 최대 40,000점 */
  episodesPublished: { weight: 40, cap: 1_000 },
  /** 누적 조회 100회 = 1점. 최대 60,000점 (조회 600만) */
  viewsPerHundred: { weight: 1, cap: 60_000 },
  /** 계정 연령 1일 = 2점. 최대 7,300점 (10년) */
  accountAgeDays: { weight: 2, cap: 3_650 },
  /** 시청 1시간 = 5점. 최대 50,000점 (1만 시간) */
  watchHours: { weight: 5, cap: 10_000 },
  /** 남긴 댓글 1개 = 1점. 최대 10,000점 */
  commentsPosted: { weight: 1, cap: 10_000 },
  /** 누른 좋아요 1개 = 1점. 최대 10,000점 */
  likesGiven: { weight: 1, cap: 10_000 },
} as const

/**
 * 한 항목의 최대 기여점. 전부 `DIAMOND` 하한(100,000)보다 작아야 한다.
 *
 * 이 불변식이 등급의 의미를 정한다: **DIAMOND 는 한 축을 극단으로 밀어서
 * 도달할 수 없고, 최소 두 축이 필요하다.** 하나로 도달 가능하면 등급은 그
 * 항목의 다른 이름이 된다 (조회수 캡이 100,000이던 최초 설계가 정확히 그랬다).
 * `member-tier.test.ts` 가 항목별로 검사한다.
 */
export const TIER_CATEGORY_MAX = {
  followerCount: 50_000,
  episodesPublished: 40_000,
  viewsPerHundred: 60_000,
  accountAgeDays: 7_300,
  watchHours: 50_000,
  commentsPosted: 10_000,
  likesGiven: 10_000,
} as const

/**
 * 등급 하한선. 위에서부터 처음 넘는 등급이 된다.
 *
 * 간격이 기하급수인 이유: 선형이면 상위 등급이 시간만 지나도 차오른다.
 * 등급이 "오래 있었나" 를 뜻하면 혜택 배분이 실적과 무관해진다.
 */
export const TIER_THRESHOLDS: readonly {
  readonly tier: MemberTier
  readonly minPoints: number
}[] = [
  { tier: 'DIAMOND', minPoints: 100_000 },
  { tier: 'PLATINUM', minPoints: 25_000 },
  { tier: 'GOLD', minPoints: 5_000 },
  { tier: 'SILVER', minPoints: 500 },
  { tier: 'BRONZE', minPoints: 0 },
]

export const TIER_LADDER: readonly MemberTier[] = [
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'DIAMOND',
]

export const TIER_LABELS: Readonly<Record<MemberTier, string>> = {
  BRONZE: '브론즈',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
  DIAMOND: '다이아몬드',
}

export interface TierActivity {
  readonly followerCount: number
  readonly episodesPublished: number
  readonly totalViews: number
  readonly accountAgeDays: number
  readonly watchSeconds: number
  readonly commentsPosted: number
  readonly likesGiven: number
}

function contribute(
  value: number,
  spec: { weight: number; cap: number },
): number {
  // 음수 입력은 0으로 본다. 카운터 보정 배치가 일시적으로 음수를 만들 수 있고,
  // 그것이 점수를 깎아 등급을 떨어뜨리면 원인 추적이 어렵다.
  const bounded = Math.min(Math.max(0, Math.trunc(value)), spec.cap)
  return bounded * spec.weight
}

/** 활동 → 점수. 순수 함수이므로 전조합 테스트가 가능하다. */
export function computeTierPoints(activity: TierActivity): number {
  return (
    contribute(activity.followerCount, TIER_WEIGHTS.followerCount) +
    contribute(activity.episodesPublished, TIER_WEIGHTS.episodesPublished) +
    contribute(
      Math.floor(activity.totalViews / 100),
      TIER_WEIGHTS.viewsPerHundred,
    ) +
    contribute(activity.accountAgeDays, TIER_WEIGHTS.accountAgeDays) +
    contribute(
      Math.floor(activity.watchSeconds / 3600),
      TIER_WEIGHTS.watchHours,
    ) +
    contribute(activity.commentsPosted, TIER_WEIGHTS.commentsPosted) +
    contribute(activity.likesGiven, TIER_WEIGHTS.likesGiven)
  )
}

/** 점수 → 등급. */
export function tierForPoints(points: number): MemberTier {
  for (const threshold of TIER_THRESHOLDS) {
    if (points >= threshold.minPoints) return threshold.tier
  }
  // TIER_THRESHOLDS 는 minPoints 0 인 BRONZE 로 끝나므로 여기 오지 않는다.
  return 'BRONZE'
}

export interface TierEvaluation {
  readonly points: number
  readonly tier: MemberTier
  readonly changed: boolean
  /** 다음 등급까지 남은 점수. 최상위면 `null`. */
  readonly pointsToNext: number | null
  readonly nextTier: MemberTier | null
}

/**
 * 재평가. **하락을 허용한다.**
 *
 * 등급을 내리지 않으면 한 번 올라간 계정이 활동을 멈춰도 혜택을 계속 쓴다.
 * 혜택은 서버 용량의 배분이므로, 유령 등급이 쌓이면 실제로 활동하는 계정의
 * 몫이 줄어든다. 등급은 상태가 아니라 현재 실적의 표현이다.
 */
export function evaluateTier(
  activity: TierActivity,
  currentTier: MemberTier,
): TierEvaluation {
  const points = computeTierPoints(activity)
  const tier = tierForPoints(points)
  const index = TIER_LADDER.indexOf(tier)
  const nextTier = TIER_LADDER[index + 1] ?? null
  const nextThreshold =
    nextTier === null
      ? null
      : (TIER_THRESHOLDS.find((entry) => entry.tier === nextTier)?.minPoints ??
        null)

  return {
    points,
    tier,
    changed: tier !== currentTier,
    nextTier,
    pointsToNext:
      nextThreshold === null ? null : Math.max(0, nextThreshold - points),
  }
}
