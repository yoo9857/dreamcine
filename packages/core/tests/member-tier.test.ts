import { describe, expect, it } from 'vitest'

import { CAPACITY_TIERS } from '../src/capacity.js'
import { MemberTier } from '../src/enums.js'
import { LIMITS } from '../src/limits.js'
import {
  TIER_ALLOWANCE,
  resolveEntitlements,
} from '../src/rules/entitlements.js'
import {
  TIER_CATEGORY_MAX,
  TIER_LABELS,
  TIER_LADDER,
  TIER_THRESHOLDS,
  TIER_WEIGHTS,
  computeTierPoints,
  evaluateTier,
  tierForPoints,
  type TierActivity,
} from '../src/rules/member-tier.js'
import { ROLE_LADDER } from '../src/rules/roles.js'

const ZERO: TierActivity = {
  followerCount: 0,
  episodesPublished: 0,
  totalViews: 0,
  accountAgeDays: 0,
  watchSeconds: 0,
  commentsPosted: 0,
  likesGiven: 0,
}

describe('등급 사다리', () => {
  it('열거형과 사다리가 일치한다', () => {
    expect([...TIER_LADDER]).toEqual([...MemberTier])
  })

  it('모든 등급에 라벨이 있다', () => {
    for (const tier of TIER_LADDER) {
      expect(TIER_LABELS[tier]).toBeTruthy()
    }
  })

  it('하한선은 내림차순이고 BRONZE 가 0 이다', () => {
    const points = TIER_THRESHOLDS.map((entry) => entry.minPoints)
    expect(points).toEqual([...points].sort((a, b) => b - a))
    expect(TIER_THRESHOLDS.at(-1)).toEqual({ tier: 'BRONZE', minPoints: 0 })
  })

  it('모든 등급이 하한선 표에 정확히 한 번 나온다', () => {
    expect(new Set(TIER_THRESHOLDS.map((entry) => entry.tier)).size).toBe(
      TIER_LADDER.length,
    )
  })
})

describe('computeTierPoints()', () => {
  it('활동이 없으면 0 점', () => {
    expect(computeTierPoints(ZERO)).toBe(0)
  })

  it('음수는 0 으로 본다', () => {
    // 카운터 보정 배치가 일시적으로 음수를 만들 수 있다. 그것이 점수를 깎으면
    // 등급 하락의 원인 추적이 불가능해진다.
    expect(
      computeTierPoints({ ...ZERO, followerCount: -100, likesGiven: -5 }),
    ).toBe(0)
  })

  it('항목마다 상한이 걸린다', () => {
    const overCap: TierActivity = {
      ...ZERO,
      followerCount: TIER_WEIGHTS.followerCount.cap * 10,
    }
    const atCap: TierActivity = {
      ...ZERO,
      followerCount: TIER_WEIGHTS.followerCount.cap,
    }
    expect(computeTierPoints(overCap)).toBe(computeTierPoints(atCap))
  })

  it('가중치가 문서대로 적용된다', () => {
    expect(computeTierPoints({ ...ZERO, followerCount: 10 })).toBe(
      10 * TIER_WEIGHTS.followerCount.weight,
    )
    expect(computeTierPoints({ ...ZERO, episodesPublished: 3 })).toBe(
      3 * TIER_WEIGHTS.episodesPublished.weight,
    )
    // 조회수는 100 단위로 절사된다
    expect(computeTierPoints({ ...ZERO, totalViews: 199 })).toBe(
      1 * TIER_WEIGHTS.viewsPerHundred.weight,
    )
    // 시청 시간은 시 단위로 절사된다
    expect(computeTierPoints({ ...ZERO, watchSeconds: 7199 })).toBe(
      1 * TIER_WEIGHTS.watchHours.weight,
    )
  })

  it('제작이 소비보다 무겁다', () => {
    // 회차 1편(40점) > 댓글 1개(1점). 등급이 "많이 떠든 사람" 을 뜻하지 않게 한다.
    expect(TIER_WEIGHTS.episodesPublished.weight).toBeGreaterThan(
      TIER_WEIGHTS.commentsPosted.weight,
    )
  })

  it('선언된 항목별 최대 기여점이 실제 계산과 같다', () => {
    const maxed: Record<keyof typeof TIER_CATEGORY_MAX, TierActivity> = {
      followerCount: { ...ZERO, followerCount: 10 ** 9 },
      episodesPublished: { ...ZERO, episodesPublished: 10 ** 9 },
      viewsPerHundred: { ...ZERO, totalViews: 10 ** 12 },
      accountAgeDays: { ...ZERO, accountAgeDays: 10 ** 6 },
      watchHours: { ...ZERO, watchSeconds: 10 ** 12 },
      commentsPosted: { ...ZERO, commentsPosted: 10 ** 9 },
      likesGiven: { ...ZERO, likesGiven: 10 ** 9 },
    }
    for (const [category, activity] of Object.entries(maxed)) {
      expect(computeTierPoints(activity)).toBe(
        TIER_CATEGORY_MAX[category as keyof typeof TIER_CATEGORY_MAX],
      )
    }
  })

  it('한 항목만 최대치여도 DIAMOND 가 되지 않는다', () => {
    // 상한 하나가 나머지를 무의미하게 만드는 것을 막는 핵심 불변식이다.
    // DIAMOND 는 최소 두 축을 요구한다.
    const diamondFloor = TIER_THRESHOLDS.find(
      (entry) => entry.tier === 'DIAMOND',
    )
    expect(diamondFloor).toBeDefined()
    for (const max of Object.values(TIER_CATEGORY_MAX)) {
      expect(max).toBeLessThan(diamondFloor?.minPoints ?? 0)
      expect(tierForPoints(max)).not.toBe('DIAMOND')
    }
  })
})

describe('tierForPoints()', () => {
  it('경계값은 그 등급에 포함된다', () => {
    for (const { tier, minPoints } of TIER_THRESHOLDS) {
      expect(tierForPoints(minPoints)).toBe(tier)
    }
  })

  it('경계 1점 아래는 한 단계 낮다', () => {
    for (const { tier, minPoints } of TIER_THRESHOLDS) {
      if (minPoints === 0) continue
      const lower = TIER_LADDER[TIER_LADDER.indexOf(tier) - 1]
      expect(tierForPoints(minPoints - 1)).toBe(lower)
    }
  })

  it('음수도 BRONZE 로 떨어진다', () => {
    expect(tierForPoints(-1)).toBe('BRONZE')
  })
})

describe('evaluateTier()', () => {
  it('하락을 허용한다', () => {
    // 등급은 상태가 아니라 현재 실적의 표현이다. 내리지 않으면 유령 등급이
    // 서버 용량 배분을 잠식한다.
    const result = evaluateTier(ZERO, 'DIAMOND')
    expect(result.tier).toBe('BRONZE')
    expect(result.changed).toBe(true)
  })

  it('같은 등급이면 changed 가 false 다', () => {
    expect(evaluateTier(ZERO, 'BRONZE').changed).toBe(false)
  })

  it('다음 등급까지 남은 점수를 알려준다', () => {
    const result = evaluateTier(ZERO, 'BRONZE')
    expect(result.nextTier).toBe('SILVER')
    const silver = TIER_THRESHOLDS.find((entry) => entry.tier === 'SILVER')
    expect(result.pointsToNext).toBe(silver?.minPoints)
  })

  it('최상위는 다음 등급이 없다', () => {
    const maxed: TierActivity = {
      followerCount: TIER_WEIGHTS.followerCount.cap,
      episodesPublished: TIER_WEIGHTS.episodesPublished.cap,
      totalViews: TIER_WEIGHTS.viewsPerHundred.cap * 100,
      accountAgeDays: TIER_WEIGHTS.accountAgeDays.cap,
      watchSeconds: TIER_WEIGHTS.watchHours.cap * 3600,
      commentsPosted: TIER_WEIGHTS.commentsPosted.cap,
      likesGiven: TIER_WEIGHTS.likesGiven.cap,
    }
    const result = evaluateTier(maxed, 'BRONZE')
    expect(result.tier).toBe('DIAMOND')
    expect(result.nextTier).toBeNull()
    expect(result.pointsToNext).toBeNull()
  })
})

describe('resolveEntitlements()', () => {
  const capacity = CAPACITY_TIERS.T0

  it('BRONZE 는 배지가 없다', () => {
    // 전원이 배지를 달면 배지가 신호가 아니다.
    expect(TIER_ALLOWANCE.BRONZE.badge).toBeNull()
  })

  it('배분 비율은 등급이 오를수록 커지고 1 을 넘지 않는다', () => {
    let previous = 0
    for (const tier of TIER_LADDER) {
      const share = TIER_ALLOWANCE[tier].dailyBytesShare
      expect(share).toBeGreaterThanOrEqual(previous)
      expect(share).toBeLessThanOrEqual(1)
      previous = share
    }
  })

  it('제작 권한이 없는 역할은 업로드 배분이 0 이다', () => {
    for (const role of ROLE_LADDER) {
      if (role === 'CREATOR' || role === 'PARTNER' || role === 'ADMIN') continue
      const result = resolveEntitlements({ capacity, role, tier: 'DIAMOND' })
      expect(result.canUpload).toBe(false)
      expect(result.uploadDailyBytes).toBe(0)
      expect(result.uploadHourlyCount).toBe(0)
      expect(result.seriesMax).toBe(0)
    }
  })

  it('등급이 서버 용량을 넘지 못한다', () => {
    for (const tier of TIER_LADDER) {
      const result = resolveEntitlements({ capacity, role: 'PARTNER', tier })
      expect(result.uploadDailyBytes).toBeLessThanOrEqual(
        capacity.uploadDailyBytes,
      )
      expect(result.uploadHourlyCount).toBeLessThanOrEqual(
        capacity.uploadHourlyCount,
      )
      expect(result.videoMaxDurationSec).toBeLessThanOrEqual(
        capacity.videoMaxDurationSec,
      )
      expect(result.seriesMax).toBeLessThanOrEqual(LIMITS.SERIES_PER_USER)
    }
  })

  it('파일 1개 상한은 등급으로 나누지 않는다', () => {
    // 트랜스코드 워커의 tmp 용량·타임아웃에서 나온 기술적 한계이지 혜택이 아니다.
    for (const tier of TIER_LADDER) {
      expect(
        resolveEntitlements({ capacity, role: 'CREATOR', tier }).uploadMaxBytes,
      ).toBe(capacity.uploadMaxBytes)
    }
  })

  it('PARTNER 는 등급이 낮아도 하한을 보장받는다', () => {
    const bronzeCreator = resolveEntitlements({
      capacity,
      role: 'CREATOR',
      tier: 'BRONZE',
    })
    const bronzePartner = resolveEntitlements({
      capacity,
      role: 'PARTNER',
      tier: 'BRONZE',
    })
    expect(bronzePartner.uploadDailyBytes).toBeGreaterThan(
      bronzeCreator.uploadDailyBytes,
    )
    expect(bronzePartner.videoMaxDurationSec).toBe(capacity.videoMaxDurationSec)
  })

  it('정산 자격은 역할과 등급을 둘 다 요구한다', () => {
    expect(
      resolveEntitlements({ capacity, role: 'PARTNER', tier: 'SILVER' })
        .monetizationEligible,
    ).toBe(false)
    expect(
      resolveEntitlements({ capacity, role: 'PARTNER', tier: 'GOLD' })
        .monetizationEligible,
    ).toBe(true)
    expect(
      resolveEntitlements({ capacity, role: 'CREATOR', tier: 'DIAMOND' })
        .monetizationEligible,
    ).toBe(false)
    // ADMIN 은 운영 계정이므로 정산 대상이 아니다.
    expect(
      resolveEntitlements({ capacity, role: 'ADMIN', tier: 'DIAMOND' })
        .monetizationEligible,
    ).toBe(false)
  })

  it('ADMIN 은 등급 배분을 받지 않고 용량 전부를 쓴다', () => {
    const result = resolveEntitlements({
      capacity,
      role: 'ADMIN',
      tier: 'BRONZE',
    })
    expect(result.uploadDailyBytes).toBe(capacity.uploadDailyBytes)
    expect(result.videoMaxDurationSec).toBe(capacity.videoMaxDurationSec)
  })
})
