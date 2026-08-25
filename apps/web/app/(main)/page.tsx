import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { FeedList } from '@/src/components/feed/FeedList'
import { getFeed } from '@/src/services/feed/get-feed'

export default async function HomePage(): Promise<ReactNode> {
  const session = await getServerSession()
  const page = await getFeed({ type: 'popular', limit: 20 }, session)
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">인기 에피소드</h1>
        <p className="text-sm text-fg-muted">
          지금 가장 주목받는 이야기를 만나보세요.
        </p>
      </div>
      <FeedList
        type="popular"
        initialItems={page.items}
        initialCursor={page.nextCursor}
      />
    </div>
  )
}
