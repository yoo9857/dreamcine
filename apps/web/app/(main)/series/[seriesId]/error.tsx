'use client'

import { ErrorState } from '@aidream/ui'
import type { ReactNode } from 'react'

export default function ErrorPage({
  reset,
}: {
  readonly reset: () => void
}): ReactNode {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <ErrorState
        code="E_INTERNAL"
        description="시리즈를 불러오지 못했습니다."
        onRetry={reset}
      />
    </main>
  )
}
