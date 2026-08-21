import { cn } from '../lib/cn.js'
import type { ReactNode } from 'react'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  /** 스크린리더용 진행 안내. */
  label?: string
  className?: string
}

const SIZE = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-[3px]',
} as const

export function Spinner({
  size = 'md',
  label = '불러오는 중',
  className,
}: SpinnerProps): ReactNode {
  return (
    <span role="status" className={cn('inline-flex', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'animate-spin rounded-full border-current border-t-transparent',
          SIZE[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
