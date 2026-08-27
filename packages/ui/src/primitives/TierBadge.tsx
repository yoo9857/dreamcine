import { TIER_LABELS, type MemberTier } from '@aidream/core'
import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../lib/cn.js'

export interface TierBadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  readonly tier: MemberTier
  readonly size?: 'xs' | 'sm'
  /**
   * 라벨을 숨기고 점만 남긴다. 이름 옆에 여러 개가 붙는 좁은 자리
   * (댓글 목록, 카드 하단)를 위한 것이다.
   */
  readonly compact?: boolean
}

/**
 * 등급별 색. `warning` · `success` 같은 **상태** 토큰을 쓰지 않는다 —
 * 상태 색이 바뀔 때 등급 배지가 따라 변하면 안 된다. (ISS-020)
 *
 * `BRONZE` 가 없는 것이 이 표의 핵심이다. 배지가 없는 등급이므로
 * `TierBadge` 는 `null` 을 렌더한다. 전원이 배지를 달면 배지가 신호가 아니다.
 */
const TIER_STYLE: Readonly<Record<Exclude<MemberTier, 'BRONZE'>, string>> = {
  SILVER: 'bg-tier-silver-subtle text-fg border-tier-silver',
  GOLD: 'bg-tier-gold-subtle text-fg border-tier-gold',
  PLATINUM: 'bg-tier-platinum-subtle text-fg border-tier-platinum',
  DIAMOND: 'bg-tier-diamond-subtle text-fg border-tier-diamond',
}

const DOT_STYLE: Readonly<Record<Exclude<MemberTier, 'BRONZE'>, string>> = {
  SILVER: 'bg-tier-silver',
  GOLD: 'bg-tier-gold',
  PLATINUM: 'bg-tier-platinum',
  DIAMOND: 'bg-tier-diamond',
}

/**
 * 임의 크기값(`text-[0.6875rem]`)을 쓰지 않는다 — 08_UIUX_SPEC §7 이 금지하고
 * 린트가 막는다. 두 크기는 글자 크기 대신 **여백**으로 구분한다.
 */
const SIZE = {
  xs: 'text-xs px-1.5 py-0 gap-1',
  sm: 'text-xs px-2 py-0.5 gap-1',
} as const

/**
 * 회원 등급 배지.
 *
 * **권한이 아니라 혜택 등급이다.** 이 배지가 운영 권한을 뜻한다고 읽히면
 * 안 되므로 역할(`ADMIN` · `MODERATOR`)과 같은 자리에 같은 모양으로 놓지 않는다.
 *
 * 색만으로 등급을 구분하지 않는다 — `compact` 모드에서도 `aria-label` 과
 * `title` 에 등급 이름이 남는다. 색각 이상 사용자에게 색은 정보가 아니다.
 * (10_NFR.md §10)
 */
export function TierBadge({
  tier,
  size = 'sm',
  compact = false,
  className,
  ...rest
}: TierBadgeProps): ReactNode {
  if (tier === 'BRONZE') {
    return null
  }
  const label = TIER_LABELS[tier]

  if (compact) {
    return (
      <span
        className={cn(
          'inline-block size-2 shrink-0 rounded-full',
          DOT_STYLE[tier],
          className,
        )}
        role="img"
        aria-label={`${label} 등급`}
        title={`${label} 등급`}
        {...rest}
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border font-medium whitespace-nowrap',
        TIER_STYLE[tier],
        SIZE[size],
        className,
      )}
      title={`${label} 등급`}
      {...rest}
    >
      <span className={cn('size-1.5 rounded-full', DOT_STYLE[tier])} />
      {label}
    </span>
  )
}
