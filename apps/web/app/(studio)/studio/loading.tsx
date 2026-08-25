import { Skeleton } from '@aidream/ui'
import type { ReactNode } from 'react'

export default function Loading(): ReactNode {
  return (
    <main aria-label="스튜디오 불러오는 중" className="grid gap-5">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </main>
  )
}
