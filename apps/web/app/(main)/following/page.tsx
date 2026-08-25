import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { FeedList } from '@/src/components/feed/FeedList'
import { getFeed } from '@/src/services/feed/get-feed'

export default async function FollowingPage(): Promise<ReactNode> {
  const session = await getServerSession()
  if (session === null) redirect('/login?next=%2Ffollowing')
  const page = await getFeed({ type: 'following', limit: 20 }, session)
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">팔로잉</h1>
        <p className="text-sm text-fg-muted">
          팔로우한 제작자의 새 에피소드입니다.
        </p>
      </div>
      <FeedList
        type="following"
        initialItems={page.items}
        initialCursor={page.nextCursor}
      />
    </div>
  )
}
