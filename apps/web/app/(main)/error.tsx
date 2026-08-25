'use client'

import { ErrorState } from '@aidream/ui'
import type { ReactNode } from 'react'

export default function MainError({
  reset,
}: {
  readonly reset: () => void
}): ReactNode {
  return (
    <ErrorState description="목록을 불러오지 못했습니다." onRetry={reset} />
  )
}
