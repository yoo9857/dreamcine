import type { ReactNode } from 'react'

import { FeedSkeleton } from '@/src/components/feed/FeedList'

export default function Loading(): ReactNode {
  return <FeedSkeleton count={8} />
}
