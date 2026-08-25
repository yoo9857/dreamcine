import { Skeleton } from '@aidream/ui'
import type { ReactNode } from 'react'

export function FeedSkeleton({
  count = 8,
}: {
  readonly count?: number
}): ReactNode {
  return (
    <div
      aria-label="피드 불러오는 중"
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }, (_unused, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-border"
        >
          <Skeleton className="aspect-video w-full" />
          <div className="space-y-3 p-4">
            <Skeleton variant="text" />
            <Skeleton variant="text" />
          </div>
        </div>
      ))}
    </div>
  )
}
