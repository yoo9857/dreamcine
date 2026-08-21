'use client'

import * as RadixProgress from '@radix-ui/react-progress'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn.js'
import { LABEL_CLASS } from './Input.js'

export interface ProgressProps {
  /** 0 ~ 100. 범위를 벗어나면 잘라낸다. */
  value: number
  label: string
  hideLabel?: boolean
  className?: string
}

export function Progress({
  value,
  label,
  hideLabel = false,
  className,
}: ProgressProps): ReactNode {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn(LABEL_CLASS, hideLabel && 'sr-only')}>{label}</span>
        <span className={cn('text-sm text-fg-muted', hideLabel && 'sr-only')}>
          {clamped}%
        </span>
      </div>
      <RadixProgress.Root
        value={clamped}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated"
      >
        <RadixProgress.Indicator
          className="h-full bg-accent transition-transform"
          style={{ transform: `translateX(-${String(100 - clamped)}%)` }}
        />
      </RadixProgress.Root>
    </div>
  )
}
