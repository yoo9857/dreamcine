import type { PublicUserSummary } from '@aidream/core'
import { TierBadge } from '@aidream/ui'
import { BadgeCheck } from 'lucide-react'
import Link from 'next/link'
import React, { type ReactNode } from 'react'

export interface UserBadgesProps {
  readonly user: PublicUserSummary
  /** 좁은 자리에서는 등급 배지를 점으로 줄인다. */
  readonly compact?: boolean
  readonly className?: string
}

/**
 * 인증 마크 + 등급 배지만. 이름은 붙이지 않는다.
 *
 * **제목 안에 넣지 말고 옆에 둔다.** `<h3>` 안에 배지를 넣으면 제목의 접근성
 * 이름이 "두 번째 작가골드" 가 된다 — 스크린리더 사용자에게 제목이 사람 이름이
 * 아니게 되고, 제목으로 요소를 찾는 테스트도 깨진다. 실제로 그렇게 만들었다가
 * `CreatorDirectory.test.tsx` 가 잡았다.
 *
 * 인증과 등급의 순서는 고정이다(인증 → 등급). 둘은 다른 것을 뜻한다 —
 * 인증은 **신원**, 등급은 **실적**이다.
 */
export function UserBadges({
  user,
  compact = false,
  className,
}: UserBadgesProps): ReactNode {
  if (!user.isVerified && user.tier === 'BRONZE') {
    // 그릴 것이 없으면 빈 래퍼도 만들지 않는다. 빈 span 이 gap 을 벌린다.
    return null
  }
  return (
    <span
      className={
        className === undefined
          ? 'inline-flex shrink-0 items-center gap-1.5'
          : `inline-flex shrink-0 items-center gap-1.5 ${className}`
      }
    >
      {user.isVerified ? (
        <BadgeCheck
          className="size-3.5 shrink-0 text-accent"
          aria-label="인증 채널"
          role="img"
        />
      ) : null}
      <TierBadge tier={user.tier} size="xs" compact={compact} />
    </span>
  )
}

export interface UserTierLineProps extends UserBadgesProps {
  /** 이름을 프로필로 링크할지. 바깥이 이미 링크면 끈다 — 중첩 링크는 무효 마크업이다. */
  readonly link?: boolean
  /** 이름 대신 `@handle` 을 보여준다. */
  readonly showHandle?: boolean
}

/**
 * "이름 + 인증 + 등급" 한 줄.
 *
 * 왜 컴포넌트인가: 등급 배지는 작품 카드·작가 이름·댓글 작성자·프로필 헤더에
 * 모두 붙는다. 각 화면이 직접 `<TierBadge>` 를 놓으면 순서·간격·링크 여부가
 * 화면마다 어긋나고, 한 곳을 빠뜨렸을 때 "댓글에는 배지가 뜨는데 피드에는 안
 * 뜨는" 상태가 된다. 붙일 자리는 여기 하나다.
 *
 * 제목(`<h1>`~`<h6>`) 안에서는 이 컴포넌트를 쓰지 않는다 — `UserBadges` 를
 * 제목 **옆**에 둔다. 이유는 `UserBadges` 주석에 있다.
 */
export function UserTierLine({
  user,
  link = true,
  compact = false,
  className,
  showHandle = false,
}: UserTierLineProps): ReactNode {
  const name = showHandle ? `@${user.handle}` : user.displayName
  const label = <span className="truncate">{name}</span>

  return (
    <span
      className={
        className === undefined
          ? 'inline-flex min-w-0 items-center gap-1.5'
          : `inline-flex min-w-0 items-center gap-1.5 ${className}`
      }
    >
      {link ? (
        <Link href={`/u/${user.handle}`} className="min-w-0 truncate">
          {label}
        </Link>
      ) : (
        label
      )}
      <UserBadges user={user} compact={compact} />
    </span>
  )
}
