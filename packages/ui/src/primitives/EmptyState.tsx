import { NotImplementedError } from '@aidream/core'
import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  /** 08_UIUX_SPEC.md §10 — 다음 행동을 항상 제시한다. */
  action?: ReactNode
  className?: string
}

export function EmptyState(_props: EmptyStateProps): ReactNode {
  throw new NotImplementedError('T14:emptyState')
}
