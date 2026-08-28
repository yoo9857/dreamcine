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
  SILVER: 'text-tier-silver',
  GOLD: 'text-tier-gold',
  PLATINUM: 'text-tier-platinum',
  DIAMOND: 'text-tier-diamond',
}

function TierMark({
  tier,
  labelled = false,
}: {
  readonly tier: Exclude<MemberTier, 'BRONZE'>
  readonly labelled?: boolean
}): ReactNode {
  const label = `${TIER_LABELS[tier]} 등급`

  return (
    <svg
      viewBox="0 0 16 16"
      className={cn('size-3 shrink-0', DOT_STYLE[tier])}
      fill="none"
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? label : undefined}
      role={labelled ? 'img' : undefined}
    >
      {tier === 'SILVER' ? (
        <>
          <circle
            cx="8"
            cy="8"
            r="5.25"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M5 10.5 10.5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {tier === 'GOLD' ? (
        <>
          <circle
            cx="8"
            cy="8"
            r="5.4"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M5 10V8.5M8 10V6.5M11 10V4.75"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {tier === 'PLATINUM' ? (
        <path
          d="M8 1.75 13.4 4.9v6.2L8 14.25 2.6 11.1V4.9L8 1.75Zm0 2.1L4.45 5.92v4.16L8 12.15l3.55-2.07V5.92L8 3.85Z"
          fill="currentColor"
        />
      ) : null}
      {tier === 'DIAMOND' ? (
        <>
          <path
            d="m2.1 6.15 2.25-3h7.3l2.25 3L8 13.35 2.1 6.15Z"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path
            d="m4.35 3.15 1.4 3L8 13.35l2.25-7.2 1.4-3M2.1 6.15h11.8"
            stroke="currentColor"
            strokeWidth="1.05"
            strokeLinejoin="round"
          />
        </>
      ) : null}
    </svg>
  )
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
          'inline-grid size-4 shrink-0 place-items-center rounded-full border',
          TIER_STYLE[tier],
          className,
        )}
        title={`${label} 등급`}
        {...rest}
      >
        <TierMark tier={tier} labelled />
      </span>
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
      <TierMark tier={tier} />
      {label}
    </span>
  )
}
