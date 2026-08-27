import Image from 'next/image'
import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'

import type { FeedItem } from '@aidream/core'

import type { RouteSession } from '@/src/auth/types'
import { FeedSkeleton } from '@/src/components/feed/FeedSkeleton'
import { getFeed } from '@/src/services/feed/get-feed'
import { getSeries } from '@/src/services/series/get-series'

import { DiscoveryBackdrop } from './DiscoveryBackdrop'
import { DiscoveryCreatorCta } from './DiscoveryCreatorCta'
import { DiscoveryFooter } from './DiscoveryFooter'
import { DiscoveryStoryShelves } from './DiscoveryStoryShelves'
import { DiscoveryTopbar } from './DiscoveryTopbar'
import { HeroLikeButton } from './HeroLikeButton'

const discoveryTabs = [
  { href: '/browse', label: '전체', active: true },
  { href: '/search', label: '새로 올라온' },
  { href: '/following', label: '팔로잉' },
  { href: '/search?q=드라마', label: '드라마' },
  { href: '/search?q=예능', label: '예능' },
  { href: '/search?q=음악', label: '뮤직' },
  { href: '/search?q=다큐', label: '다큐멘터리' },
  { href: '/search?q=숏폼', label: '숏폼' },
] as const

const developmentBrowseItem = {
  episodeId: 'preview-red-horizon',
  title: '첫 번째 장면 · 비가 그친 뒤',
  thumbUrl: '/brand/works/red-horizon.png',
  durationSec: 1482,
  ageRating: 'ALL',
  viewCount: '12840',
  likeCount: 926,
  publishedAt: '2026-08-24T12:00:00.000Z',
  series: {
    id: 'preview-red-horizon',
    title: '붉은 지평선 너머',
    slug: 'red-horizon',
  },
  creator: {
    handle: 'hanbin',
    displayName: '한빈',
    avatarUrl: null,
  },
  isLiked: false,
} satisfies FeedItem

function DiscoveryFallback(): ReactNode {
  return (
    <div className="discovery-loading" aria-label="인기 에피소드 불러오는 중">
      <div className="discovery-hero-placeholder">
        <span>AIDREAM ORIGINALS</span>
        <h1>
          취향이 열리는 순간,
          <br />
          ilog.
        </h1>
      </div>
      <FeedSkeleton count={3} />
    </div>
  )
}

function DiscoveryTabs(): ReactNode {
  return (
    <nav className="discovery-tabs" aria-label="콘텐츠 탐색">
      {discoveryTabs.map((tab) => (
        <Link
          href={tab.href}
          className={'active' in tab ? 'is-active' : undefined}
          key={tab.label}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}

async function PopularDiscovery({
  session,
}: {
  readonly session: RouteSession
}): Promise<ReactNode> {
  const isDevelopmentPreview =
    process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL
  const page = isDevelopmentPreview
    ? { items: [developmentBrowseItem], nextCursor: null }
    : await getFeed({ type: 'popular', limit: 20 }, session)
  const lead = page.items[0]
  if (lead === undefined) {
    return (
      <>
        <section
          className="discovery-empty-hero"
          aria-labelledby="empty-discovery-title"
        >
          <div>
            <h1 id="empty-discovery-title">아직 공개된 작품이 없습니다</h1>
            <p>새로운 작품이 공개되면 이곳에서 가장 먼저 소개합니다.</p>
            <Link href="/creators">크리에이터 둘러보기</Link>
          </div>
        </section>
        <DiscoveryTabs />
        <DiscoveryStoryShelves items={[]} />
      </>
    )
  }

  const featuredSeries = isDevelopmentPreview
    ? null
    : await getSeries(lead.series.id).catch(() => null)
  const synopsis =
    featuredSeries?.series.synopsis ??
    (isDevelopmentPreview
      ? '끝없이 비가 내리는 도시, 한 사람이 붉은 빛의 근원을 찾아 경계 너머로 향합니다.'
      : '작품 소개가 아직 등록되지 않았습니다.')

  return (
    <>
      <section
        className="discovery-hero"
        aria-labelledby="discovery-title"
        data-cinematic-hero
      >
        {lead.thumbUrl === null ? (
          <div className="discovery-hero-art" aria-hidden="true" />
        ) : (
          <Image
            src={lead.thumbUrl}
            alt=""
            fill
            priority
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1536px) 92vw, 1400px"
            className="discovery-hero-image"
          />
        )}
        <DiscoveryBackdrop episodeId={lead.episodeId} />
        <div className="discovery-hero-shade" />
        <div className="discovery-hero-copy">
          <h1 id="discovery-title">{lead.series.title}</h1>
          <p className="discovery-hero-subtitle">{lead.title}</p>
          <p className="discovery-hero-synopsis">{synopsis}</p>
          <div className="discovery-hero-actions">
            <Link href={`/watch/${lead.episodeId}`}>
              <span aria-hidden="true">▶</span> 지금 재생
            </Link>
            <HeroLikeButton
              episodeId={lead.episodeId}
              initialLiked={lead.isLiked}
              initialCount={lead.likeCount}
              authenticated
            />
          </div>
        </div>
      </section>

      <DiscoveryTabs />

      <DiscoveryStoryShelves items={page.items} />
    </>
  )
}

export function AuthenticatedDiscoveryHome({
  session,
}: {
  readonly session: RouteSession
}): ReactNode {
  return (
    <div className="discovery-home" id="discovery-top">
      <DiscoveryTopbar user={session.user} />
      <Suspense fallback={<DiscoveryFallback />}>
        <PopularDiscovery session={session} />
      </Suspense>
      <DiscoveryCreatorCta />
      <DiscoveryFooter handle={session.user.handle} />
    </div>
  )
}
