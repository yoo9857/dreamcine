'use client'

import { ErrorState } from '@aidream/ui'
import type { ReactNode } from 'react'

export default function ErrorPage({
  reset,
}: {
  readonly reset: () => void
}): ReactNode {
  return (
    <ErrorState
      code="E_INTERNAL"
      description="스튜디오 목록을 불러오지 못했습니다."
      onRetry={reset}
    />
  )
}
