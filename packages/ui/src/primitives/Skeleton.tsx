import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../lib/cn.js'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle'
  /** `variant='text'` 일 때 줄 수. */
  lines?: number
}

const VARIANT = {
  text: 'h-4 rounded-sm',
  rect: 'rounded-md',
  circle: 'rounded-full',
} as const

export function Skeleton({
  variant = 'rect',
  lines = 1,
  className,
  ...rest
}: SkeletonProps): ReactNode {
  if (variant === 'text' && lines > 1) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-2" {...rest}>
        {Array.from({ length: lines }, (_unused, index) => (
          <div
            key={index}
            className={cn(
              'animate-pulse bg-bg-elevated',
              VARIANT.text,
              // 마지막 줄은 짧게 — 문단처럼 보이게 한다.
              index === lines - 1 ? 'w-2/3' : 'w-full',
              className,
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-bg-elevated',
        VARIANT[variant],
        className,
      )}
      {...rest}
    />
  )
}
