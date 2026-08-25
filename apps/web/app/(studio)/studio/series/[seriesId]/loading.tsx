import { Skeleton } from '@aidream/ui'
import type { ReactNode } from 'react'

export default function Loading(): ReactNode {
  return (
    <main aria-label="에피소드 관리 화면 불러오는 중" className="grid gap-6">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-72" />
      <Skeleton className="h-64" />
    </main>
  )
}
