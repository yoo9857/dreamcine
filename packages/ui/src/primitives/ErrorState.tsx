import type { ErrorCode } from '@aidream/core'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn.js'
import { Button } from './Button.js'

export interface ErrorStateProps {
  /** 사용자 문구. `error-messages.ts` 에서 온 값을 그대로 넣는다. */
  description: string
  title?: string
  /** 문의 추적용으로 화면에 표시한다. */
  code?: ErrorCode
  requestId?: string
  /** 재시도 수단은 필수다. (08_UIUX_SPEC.md §3) */
  onRetry: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  description,
  title = '문제가 생겼습니다',
  code,
  requestId,
  onRetry,
  retryLabel = '다시 시도',
  className,
}: ErrorStateProps): ReactNode {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-danger bg-danger-subtle px-6 py-10 text-center',
        className,
      )}
    >
      <p className="text-base font-semibold text-fg">{title}</p>
      <p className="text-sm text-fg-secondary">{description}</p>
      <Button variant="secondary" onClick={onRetry}>
        {retryLabel}
      </Button>
      {code === undefined && requestId === undefined ? null : (
        <p className="text-xs text-fg-muted">
          {[code, requestId].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  )
}
