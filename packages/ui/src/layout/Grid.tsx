import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../lib/cn.js'
import type { SpaceKey } from '../tokens/index.js'

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** 08_UIUX_SPEC.md §2 의 브레이크포인트별 열 수를 그대로 따른다. */
  variant?: 'feed' | 'pair'
  gap?: SpaceKey
}

/**
 * 피드 열 수는 스펙 표 그대로다 — <640px 1열, 640~1023 2열,
 * 1024~1439 3열, ≥1440 4열. Tailwind 기본 브레이크포인트와 맞아떨어진다
 * (sm 640, lg 1024, 2xl 1536 대신 xl 1280 을 쓰지 않고 min-[1440px] 로 명시).
 */
const VARIANT = {
  feed: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1440px]:grid-cols-4',
  pair: 'grid-cols-1 sm:grid-cols-2',
} as const

const GAP: Readonly<Record<SpaceKey, string>> = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
  12: 'gap-12',
}

export function Grid({
  variant = 'feed',
  gap = 4,
  className,
  ...rest
}: GridProps): ReactNode {
  return (
    <div
      className={cn('grid', VARIANT[variant], GAP[gap], className)}
      {...rest}
    />
  )
}
