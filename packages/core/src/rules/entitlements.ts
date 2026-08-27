import type { Capacity } from '../capacity.js'
import type { MemberTier } from '../enums.js'
import { LIMITS } from '../limits.js'

import { isAuthorRole, isPartnerRole, type ActorRole } from './roles.js'

/**
 * 등급별 용량 배분.
 *
 * **서버 용량은 고정이고, 등급은 그것을 배분한다.** 등급이 용량을 늘리는 것이
 * 아니다 — 그렇게 만들면 등급 인플레가 그대로 서버 부하가 된다.
 * `11_CAPACITY_TIERS.md` §3 의 티어 값이 100% 기준이고, 아래 비율이 1인 등급만
 * 그 한도를 다 쓴다.
 */
export const TIER_ALLOWANCE: Readonly<
  Record<
    MemberTier,
    {
      /** 일일 업로드 바이트 중 쓸 수 있는 비율 */
      readonly dailyBytesShare: number
      /** 시간당 업로드 건수 */
      readonly hourlyCount: number
      /** 최대 영상 길이 비율 */
      readonly durationShare: number
      /** 보유 가능 시리즈 수 */
      readonly seriesMax: number
      /** 프로필에 노출할 배지. BRONZE 는 배지가 없다 — 전원이 달면 신호가 아니다 */
      readonly badge: MemberTier | null
    }
  >
> = {
  BRONZE: {
    dailyBytesShare: 0.2,
    hourlyCount: 2,
    durationShare: 0.5,
    seriesMax: 5,
    badge: null,
  },
  SILVER: {
    dailyBytesShare: 0.4,
    hourlyCount: 3,
    durationShare: 0.75,
    seriesMax: 20,
    badge: 'SILVER',
  },
  GOLD: {
    dailyBytesShare: 0.6,
    hourlyCount: 5,
    durationShare: 1,
    seriesMax: 60,
    badge: 'GOLD',
  },
  PLATINUM: {
    dailyBytesShare: 0.8,
    hourlyCount: 8,
    durationShare: 1,
    seriesMax: 120,
    badge: 'PLATINUM',
  },
  DIAMOND: {
    dailyBytesShare: 1,
    hourlyCount: 12,
    durationShare: 1,
    seriesMax: LIMITS.SERIES_PER_USER,
    badge: 'DIAMOND',
  },
}

/** PARTNER 는 등급이 낮아도 이 하한을 보장받는다. 정산 대상이 등급 등락에 흔들리면 계약이 성립하지 않는다. */
const PARTNER_FLOOR = {
  dailyBytesShare: 0.8,
  hourlyCount: 8,
  durationShare: 1,
  seriesMax: 120,
} as const

export interface Entitlements {
  readonly canUpload: boolean
  readonly uploadMaxBytes: number
  readonly uploadDailyBytes: number
  readonly uploadHourlyCount: number
  readonly videoMaxDurationSec: number
  readonly seriesMax: number
  readonly badge: MemberTier | null
  /** 정산 대상인가. 결제는 Phase 3 이지만 자격 판정 축은 지금 고정한다. */
  readonly monetizationEligible: boolean
}

export interface EntitlementInput {
  readonly capacity: Capacity
  readonly role: ActorRole
  readonly tier: MemberTier
}

/**
 * 역할 × 등급 × 서버 용량 → 실효 한도. **이 함수 밖에서 곱하지 않는다.**
 *
 * 라우트가 각자 `capacity.uploadDailyBytes * 0.6` 같은 계산을 하면, 등급 정책이
 * 바뀔 때 고쳐야 할 자리를 전부 찾아야 한다. 한 번 놓치면 그 경로만 옛 한도로
 * 남는데, 그 증상은 "특정 사용자만 업로드가 막힘" 이라 재현이 어렵다.
 *
 * `uploadMaxBytes`(파일 1개 상한)는 등급으로 나누지 않는다. 그것은 트랜스코드
 * 워커의 tmp 용량과 타임아웃에서 나온 **기술적 한계**이지 혜택이 아니다.
 */
export function resolveEntitlements(input: EntitlementInput): Entitlements {
  const { capacity, role, tier } = input
  const allowance = TIER_ALLOWANCE[tier]
  const partner = isPartnerRole(role)

  const dailyShare = partner
    ? Math.max(allowance.dailyBytesShare, PARTNER_FLOOR.dailyBytesShare)
    : allowance.dailyBytesShare
  const hourlyCount = partner
    ? Math.max(allowance.hourlyCount, PARTNER_FLOOR.hourlyCount)
    : allowance.hourlyCount
  const durationShare = partner
    ? Math.max(allowance.durationShare, PARTNER_FLOOR.durationShare)
    : allowance.durationShare
  const seriesMax = partner
    ? Math.max(allowance.seriesMax, PARTNER_FLOOR.seriesMax)
    : allowance.seriesMax

  // ADMIN 은 배분 대상이 아니다. 운영 검증 업로드가 등급에 막히면 장애 대응이
  // 막힌다.
  if (role === 'ADMIN') {
    return {
      canUpload: true,
      uploadMaxBytes: capacity.uploadMaxBytes,
      uploadDailyBytes: capacity.uploadDailyBytes,
      uploadHourlyCount: capacity.uploadHourlyCount,
      videoMaxDurationSec: capacity.videoMaxDurationSec,
      seriesMax: LIMITS.SERIES_PER_USER,
      badge: allowance.badge,
      monetizationEligible: false,
    }
  }

  // 제작 권한이 없는 역할은 업로드 배분이 0이다. 0을 주는 것과 "한도는 있는데
  // 권한이 없다" 를 구분하지 않으면, 권한 검사를 빠뜨린 경로가 한도만 보고
  // 통과한다.
  if (!isAuthorRole(role)) {
    return {
      canUpload: false,
      uploadMaxBytes: 0,
      uploadDailyBytes: 0,
      uploadHourlyCount: 0,
      videoMaxDurationSec: 0,
      seriesMax: 0,
      badge: allowance.badge,
      monetizationEligible: false,
    }
  }

  return {
    canUpload: true,
    uploadMaxBytes: capacity.uploadMaxBytes,
    uploadDailyBytes: Math.floor(capacity.uploadDailyBytes * dailyShare),
    uploadHourlyCount: Math.min(hourlyCount, capacity.uploadHourlyCount),
    videoMaxDurationSec: Math.floor(
      capacity.videoMaxDurationSec * durationShare,
    ),
    seriesMax,
    badge: allowance.badge,
    // 정산은 PARTNER 이면서 GOLD 이상. 역할만으로는 부족하고 등급만으로도
    // 부족하다 — 계약(역할)과 실적(등급)이 둘 다 있어야 한다.
    monetizationEligible:
      partner && (tier === 'GOLD' || tier === 'PLATINUM' || tier === 'DIAMOND'),
  }
}
