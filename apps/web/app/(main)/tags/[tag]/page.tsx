import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { FeedList } from '@/src/components/feed/FeedList'
import { getTagFeed } from '@/src/services/feed/search'

export default async function TagPage({
  params,
}: {
  readonly params: Promise<{ tag: string }>
}): Promise<ReactNode> {
  const { tag } = await params
  const session = await getServerSession()
  const page = await getTagFeed(tag, { limit: 20 }, session)
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-fg">#{tag}</h1>
      <FeedList
        type="latest"
        initialItems={page.items}
        initialCursor={page.nextCursor}
        endpoint={`/api/tags/${encodeURIComponent(tag)}/episodes?limit=20`}
        queryKey={['tag-feed', tag]}
      />
    </div>
  )
}
