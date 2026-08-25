import { EmptyState } from '@aidream/ui'
import { Suspense, type ReactNode } from 'react'

import { FeedList } from '@/src/components/feed/FeedList'
import { FeedSkeleton } from '@/src/components/feed/FeedSkeleton'
import { getFeed } from '@/src/services/feed/get-feed'

async function PopularFeed(): Promise<ReactNode> {
  // 홈 카드는 로그인별 좋아요 상태를 표시하지 않는다. 공개 캐시 경로를 사용해
  // 세션·개인화 DB 조회가 첫 콘텐츠 스트리밍을 지연시키지 않게 한다.
  const page = await getFeed({ type: 'popular', limit: 20 }, null)
  if (page.items.length === 0) {
    return (
      <EmptyState
        title="아직 공개된 에피소드가 없습니다"
        description="새로운 이야기가 공개되면 이곳에 표시됩니다."
      />
    )
  }
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
