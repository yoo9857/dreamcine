import type { ReactNode } from 'react'

import { cn } from '../lib/cn.js'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  /** 08_UIUX_SPEC.md §10 — 다음 행동을 항상 제시한다. */
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps): ReactNode {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-border-subtle bg-bg-elevated px-6 py-12 text-center',
        className,
      )}
    >
      {icon === undefined ? null : (
        <span aria-hidden="true" className="text-fg-muted">
          {icon}
        </span>
      )}
      <p className="text-base font-semibold text-fg">{title}</p>
      {description === undefined ? null : (
        <p className="text-sm text-fg-secondary">{description}</p>
      )}
      {action}
    </div>
  )
}
