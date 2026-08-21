import type { ReactNode } from 'react'

import { cn } from '../lib/cn.js'
import { Button } from './Button.js'

/**
 * 05_API_CONTRACT.md §1 은 **커서 페이지네이션만** 허용한다. 그래서 페이지
 * 번호가 아니라 앞/뒤 이동만 노출한다.
 */
export interface PaginationProps {
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  /** 이동 중에는 버튼이 잠긴다. */
  loading?: boolean
  previousLabel?: string
  nextLabel?: string
  className?: string
}

export function Pagination({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  loading = false,
  previousLabel = '이전',
  nextLabel = '다음',
  className,
}: PaginationProps): ReactNode {
  return (
    <nav
      aria-label="페이지 이동"
      className={cn('flex items-center justify-between gap-2', className)}
    >
      <Button
        variant="secondary"
        onClick={onPrevious}
        disabled={!hasPrevious || loading}
      >
        {previousLabel}
      </Button>
      <Button
        variant="secondary"
        onClick={onNext}
        disabled={!hasNext || loading}
      >
        {nextLabel}
      </Button>
    </nav>
  )
}
