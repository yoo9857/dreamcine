import { Skeleton } from '@aidream/ui'
import type { ReactNode } from 'react'

export default function Loading(): ReactNode {
  return (
    <main
      aria-label="시리즈 불러오는 중"
      className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-10"
    >
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-64 w-full" />
    </main>
  )
}
