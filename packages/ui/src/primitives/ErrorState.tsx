import { NotImplementedError, type ErrorCode } from '@aidream/core'
import type { ReactNode } from 'react'

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

export function ErrorState(_props: ErrorStateProps): ReactNode {
  throw new NotImplementedError('T14:errorState')
}
