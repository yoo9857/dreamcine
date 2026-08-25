import { Suspense, type ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { FeedList, FeedSkeleton } from '@/src/components/feed/FeedList'
import { getFeed } from '@/src/services/feed/get-feed'

async function PopularFeed(): Promise<ReactNode> {
  const session = await getServerSession()
  const page = await getFeed({ type: 'popular', limit: 20 }, session)
  return (
    <FeedList
      type="popular"
      initialItems={page.items}
      initialCursor={page.nextCursor}
    />
  )
}

export default function HomePage(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">인기 에피소드</h1>
        <p className="text-sm text-fg-muted">
          지금 가장 주목받는 이야기를 만나보세요.
        </p>
      </div>
      <Suspense fallback={<FeedSkeleton />}>
        <PopularFeed />
      </Suspense>
    </div>
  )
}
