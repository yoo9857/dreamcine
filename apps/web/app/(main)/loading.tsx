import type { ReactNode } from 'react'

import { FeedSkeleton } from '@/src/components/feed/FeedSkeleton'

export default function Loading(): ReactNode {
  return <FeedSkeleton count={8} />
}
