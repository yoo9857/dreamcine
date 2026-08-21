import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../lib/cn.js'

export type BadgeTone = 'neutral' | 'accent' | 'danger' | 'warning' | 'success'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  size?: 'sm' | 'md'
}

/**
 * subtle 배경 위에는 `text-fg` 만 올린다. 그 조합만 대비 검사로 고정되어
 * 있으므로, tone 색을 글자에 쓰면 검증되지 않은 쌍이 된다.
 */
const TONE: Readonly<Record<BadgeTone, string>> = {
  neutral: 'bg-bg-elevated text-fg border-border-subtle',
  accent: 'bg-accent-subtle text-fg border-accent',
  danger: 'bg-danger-subtle text-fg border-danger',
  warning: 'bg-warning-subtle text-fg border-warning',
  success: 'bg-success-subtle text-fg border-success',
}

const SIZE = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
} as const

export function Badge({
  tone = 'neutral',
  size = 'sm',
  className,
  ...rest
}: BadgeProps): ReactNode {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        TONE[tone],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  )
}
