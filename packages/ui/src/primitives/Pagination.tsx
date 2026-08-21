import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

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
  className?: string
}

export function Pagination(_props: PaginationProps): ReactNode {
  throw new NotImplementedError('T14:pagination')
}
