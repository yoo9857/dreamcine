import type { FeedItem, Page } from '@aidream/core'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { DiscoveryFooter } from '@/src/components/discovery/DiscoveryFooter'
import { DiscoveryTopbar } from '@/src/components/discovery/DiscoveryTopbar'
import { WorksCatalog } from '@/src/components/works/WorksCatalog'
import { getFeed } from '@/src/services/feed/get-feed'
import type { Metadata } from 'next'

import { absoluteUrlOrNull } from '@/src/lib/site-url'

const CANONICAL = absoluteUrlOrNull('/works')

export const metadata: Metadata = {
  title: '작품',
  description: 'ilog에 공개된 AI 드라마 시리즈 전체 목록.',
  ...(CANONICAL === null ? {} : { alternates: { canonical: CANONICAL } }),
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    title: '작품 · ilog',
    description: 'ilog에 공개된 AI 드라마 시리즈 전체 목록.',
    siteName: 'ilog',
    ...(CANONICAL === null ? {} : { url: CANONICAL }),
  },
}

import '@/src/styles/works-gallery.css'

const developmentPreviewUser = {
  id: 'preview-user',
  handle: 'hanbin',
  email: 'preview@ilog.local',
  displayName: '한빈',
  role: 'CREATOR',
  status: 'ACTIVE',
  emailVerified: true,
  tier: 'GOLD',
  isVerified: true,
} as const

const developmentPreviewItems: FeedItem[] = [
  preview(
    'red-horizon',
    '붉은 지평선 너머',
    '/brand/works/red-horizon.png',
    1482,
    '한빈',
    'hanbin',
    '12840',
    926,
  ),
  preview(
    'city-long',
    '사라지는 도시의 밤',
    '/brand/posters/city.png',
    1028,
    'ILOG ORIGINAL',
    'ilog-original',
    '8921',
    641,
  ),
  preview(
    'frame-long',
    '마지막 프레임',
    '/brand/posters/last-frame.png',
    2241,
    'FRAME LAB',
    'frame-lab',
    '7210',
    518,
  ),
  preview(
    'tomorrow-long',
    '우리가 만든 내일',
    '/brand/posters/tomorrow.png',
    1874,
    'NEW SCENE',
    'new-scene',
    '6438',
    432,
  ),
  preview(
    'paper-dance',
    '종이비가 내리는 순간',
    '/brand/works/paper-dance.png',
    47,
    'LUNA FILM',
    'luna-film',
    '23410',
    1832,
  ),
  preview(
    'city-short',
    '네온이 꺼지기 전',
    '/brand/posters/city.png',
    72,
    'ILOG ORIGINAL',
    'ilog-original',
    '18800',
    1407,
  ),
  preview(
    'memory-short',
    '잊고 싶지 않은 한 장면',
    '/brand/posters/memory.png',
    118,
    '한빈',
    'hanbin',
    '15400',
    1098,
  ),
  preview(
    'tomorrow-short',
    '내일을 만드는 상상',
    '/brand/posters/tomorrow.png',
    156,
    'NEW SCENE',
    'new-scene',
    '11320',
    804,
  ),
]

function preview(
  id: string,
  title: string,
  thumbUrl: string,
  durationSec: number,
  displayName: string,
  handle: string,
  viewCount: string,
  likeCount: number,
): FeedItem {
  return {
    episodeId: `preview-${id}`,
    title,
    thumbUrl,
    durationSec,
    ageRating: 'ALL',
    viewCount,
    likeCount,
    publishedAt: '2026-08-24T12:00:00.000Z',
    series: { id: `series-${id}`, title, slug: id },
    creator: {
      handle,
      displayName,
      avatarUrl: null,
      tier: 'GOLD',
      isVerified: true,
    },
    isLiked: false,
  }
}

async function loadWorks(
  session: Awaited<ReturnType<typeof getServerSession>>,
): Promise<Page<FeedItem>> {
  if (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL) {
    return { items: developmentPreviewItems, nextCursor: null }
  }
  return getFeed({ type: 'latest', limit: 24 }, session)
}

export default async function WorksPage(): Promise<ReactNode> {
  const session = await getServerSession()
  const headerUser =
    session?.user ??
    (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL
      ? developmentPreviewUser
      : null)
  const page = await loadWorks(session)

  return (
    <div className="works-page" id="discovery-top">
      <DiscoveryTopbar user={headerUser} />
      <WorksCatalog initialItems={page.items} initialCursor={page.nextCursor} />
      <DiscoveryFooter handle={headerUser?.handle ?? 'ilog'} />
    </div>
  )
}
