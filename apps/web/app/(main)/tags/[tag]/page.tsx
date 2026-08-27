import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { FeedList } from '@/src/components/feed/FeedList'
import type { Metadata } from 'next'
import { getTagFeed } from '@/src/services/feed/search'
import { absoluteUrlOrNull } from '@/src/lib/site-url'

/**
 * 태그 피드.
 *
 * `follow` 는 켜두되 `index` 도 켠다 — 태그는 사람이 실제로 검색하는 축이다.
 * 다만 canonical 을 태그 경로로 고정해, 쿼리스트링이 붙은 변형이 중복 색인되지
 * 않게 한다.
 */
export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ tag: string }>
}): Promise<Metadata> {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  const canonical = absoluteUrlOrNull(`/tags/${encodeURIComponent(decoded)}`)
  return {
    title: `#${decoded}`,
    description: `#${decoded} 태그가 붙은 ilog 작품 모음`,
    keywords: [decoded],
    ...(canonical === null ? {} : { alternates: { canonical } }),
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      title: `#${decoded} · ilog`,
      description: `#${decoded} 태그가 붙은 ilog 작품 모음`,
      siteName: 'ilog',
      ...(canonical === null ? {} : { url: canonical }),
    },
  }
}

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
      />
    </div>
  )
}
