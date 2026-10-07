import {
  resolveEntitlements,
  TIER_LADDER,
  TIER_THRESHOLDS,
  TIER_WEIGHTS,
  type Capacity,
  type MemberTier,
  type TierCategory,
  type UserRole,
} from '@aidream/core'

/**
 * 등급 안내 문구. 계정 메뉴의 ? 팝업, `/account/tier`, 상담 챗봇이 모두 이것을
 * 쓴다. 기준 숫자는 `@aidream/core` 의 표에서 읽는다 — 문구에 숫자를 따로 적으면
 * 정책이 바뀔 때 안내만 옛 값으로 남는다.
 */
export const TIER_PAGE_HREF = '/account/tier'

export const TIER_CATEGORY_COPY: Readonly<
  Record<TierCategory, { readonly label: string; readonly unit: string }>
> = {
  followerCount: { label: '팔로워', unit: '명' },
  episodesPublished: { label: '공개한 회차', unit: '편' },
  viewsPerHundred: { label: '내 작품 조회', unit: '백 회' },
  accountAgeDays: { label: '가입 기간', unit: '일' },
  watchHours: { label: '작품 시청', unit: '시간' },
  commentsPosted: { label: '남긴 댓글', unit: '개' },
  likesGiven: { label: '누른 좋아요', unit: '개' },
}

export const TIER_TAGLINES: Readonly<Record<MemberTier, string>> = {
  BRONZE: '모든 회원의 시작 등급',
  SILVER: '꾸준히 보고 만드는 회원',
  GOLD: '작품과 관객이 쌓인 크리에이터',
  PLATINUM: '플랫폼을 이끄는 크리에이터',
  DIAMOND: '두 개 이상의 축에서 정점에 오른 크리에이터',
}

export function tierMinPoints(tier: MemberTier): number {
  return TIER_THRESHOLDS.find((entry) => entry.tier === tier)?.minPoints ?? 0
}

export function formatPoints(value: number): string {
  return value.toLocaleString('ko-KR')
}

/** "팔로워 1명 = 1점" 같은 한 줄. 조회·시청은 환산 단위를 그대로 쓴다. */
export function categoryRule(category: TierCategory): string {
  const { label, unit } = TIER_CATEGORY_COPY[category]
  const { weight } = TIER_WEIGHTS[category]
  const per = unit === '백 회' ? '100회' : `1${unit}`
  return `${label} ${per} = ${formatPoints(weight)}점`
}

export interface TierLadderRow {
  readonly tier: MemberTier
  readonly minPoints: number
  readonly tagline: string
}

export const TIER_LADDER_ROWS: readonly TierLadderRow[] = TIER_LADDER.map(
  (tier) => ({
    tier,
    minPoints: tierMinPoints(tier),
    tagline: TIER_TAGLINES[tier],
  }),
)

export interface TierBenefitRow {
  readonly tier: MemberTier
  readonly hourlyUploads: number
  readonly dailyUploadBytes: number
  readonly seriesMax: number
}

export interface TierBenefits {
  /** 이 역할에서 등급이 업로드 한도를 바꾸는가 */
  readonly tierScoped: boolean
  readonly note: string | null
  readonly rows: readonly TierBenefitRow[]
}

/**
 * 등급별 실제 업로드 한도. 비율 표(`TIER_ALLOWANCE`)를 그대로 보여주면 서버 용량
 * 티어의 상한과 역할 하한이 빠진다 — 그래서 판정 함수 `resolveEntitlements` 를
 * 그대로 거친다. 제작 역할이 아니면 크리에이터 기준 표를 보여주고 그렇게 말한다.
 */
export function tierBenefits(role: UserRole, capacity: Capacity): TierBenefits {
  const author = role === 'CREATOR' || role === 'PARTNER'
  const shownRole = author ? role : 'CREATOR'
  const rows = TIER_LADDER.map((tier) => {
    const entitlements = resolveEntitlements({
      capacity,
      role: shownRole,
      tier,
    })
    return {
      tier,
      hourlyUploads: entitlements.uploadHourlyCount,
      dailyUploadBytes: entitlements.uploadDailyBytes,
      seriesMax: entitlements.seriesMax,
    }
  })
  const note =
    role === 'ADMIN'
      ? '관리자 계정은 등급과 관계없이 운영 한도를 사용합니다. 아래 표는 크리에이터 기준입니다.'
      : role === 'PARTNER'
        ? '파트너 크리에이터는 등급이 낮아도 보장 하한이 적용된 값입니다.'
        : author
          ? null
          : '업로드 혜택은 크리에이터 역할부터 적용됩니다. 아래 표는 크리에이터 기준입니다.'
  return { tierScoped: author, note, rows }
}

export function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3
  if (gb >= 1) return `${String(Math.round(gb * 10) / 10)}GB`
  return `${String(Math.round(bytes / 1024 ** 2))}MB`
}

/** 챗봇 안내문. 같은 표에서 만든다. */
export function tierHelpAnswer(): string {
  const ladder = TIER_LADDER_ROWS.map(
    (row) => `${row.tier} ${formatPoints(row.minPoints)}점`,
  ).join(' → ')
  return (
    `크리에이터 등급은 활동 점수로 정해집니다: ${ladder} 이상. ` +
    '점수는 팔로워, 공개한 회차, 내 작품 조회, 가입 기간, 작품 시청, 댓글, 좋아요를 합산하고 항목마다 상한이 있어 한 가지만으로는 최상위 등급에 오를 수 없습니다. ' +
    '크리에이터는 등급이 높을수록 업로드 한도와 보유 시리즈 수가 늘어납니다. 등급은 정기 평가로 바뀌며, 활동이 줄면 내려갈 수도 있습니다. ' +
    '내 점수와 항목별 내역은 내 등급 페이지에서 확인하세요.'
  )
}
