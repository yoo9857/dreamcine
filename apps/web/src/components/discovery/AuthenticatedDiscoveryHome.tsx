import Form from 'next/form'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'

import type { RouteSession } from '@/src/auth/types'
import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'
import { FeedSkeleton } from '@/src/components/feed/FeedSkeleton'
import { CinematicHeroMotion } from '@/src/components/motion/CinematicHeroMotion'
import { getFeed } from '@/src/services/feed/get-feed'

import { DiscoveryBackdrop } from './DiscoveryBackdrop'
import { BrowseAccountMenu } from './BrowseAccountMenu'
import { DiscoveryCreatorCta } from './DiscoveryCreatorCta'
import { DiscoveryFooter } from './DiscoveryFooter'
import { DiscoveryStoryShelves } from './DiscoveryStoryShelves'
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

function formatDuration(durationSec: number | null): string {
  if (durationSec === null) return '--:--'
  const minutes = Math.floor(durationSec / 60)
  const seconds = Math.floor(durationSec % 60)
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`
}

function SearchIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </svg>
  )
}

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
  const page = await getFeed({ type: 'popular', limit: 20 }, session)
  const lead = page.items[0]
  if (lead === undefined) {
    return (
      <>
        <section
          className="discovery-hero"
          aria-labelledby="curated-discovery-title"
          data-cinematic-hero
        >
          <CinematicHeroMotion
            chapter="01 / CURATED PREMIERE"
            label="ILOG EDITOR'S PICK"
          />
          <Image
            src="/brand/posters/memory.png"
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1536px) 92vw, 1400px"
            className="discovery-hero-image"
          />
          <div className="discovery-hero-shade" />
          <div className="discovery-hero-copy">
            <p className="discovery-kicker">
              <span /> CURATED ON ILOG
            </p>
            <p className="discovery-hero-byline">한빈 · AI FILM</p>
            <h1 id="curated-discovery-title">내일의 기억</h1>
            <p>
              기억을 영상으로 보관하는 가까운 미래. 사라져 가는 장면을
              붙잡으려는 세 사람의 선택이 서로의 내일을 바꾸기 시작합니다.
            </p>
            <div className="discovery-hero-meta" aria-label="콘텐츠 정보">
              <span>12+</span>
              <span>DRAMA</span>
              <span>ILOG PREMIERE</span>
            </div>
            <div className="discovery-hero-actions">
              <Link href="/series/preview-1">
                <span aria-hidden="true">▶</span> 작품 보기
              </Link>
              <Link href="/u/hanbin">
                작가 프로필 <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <aside className="discovery-review-panel" aria-label="큐레이션 노트">
            <div className="discovery-review-label">
              <span>EDITOR'S NOTE</span>
              <small>이번 주의 선택</small>
            </div>
            <blockquote>“기억은 사라져도, 장면은 우리 곁에 남는다.”</blockquote>
            <p>한빈의 시네마틱 AI 드라마를 만나보세요.</p>
            <Link href="/series/preview-1">
              작품 자세히 보기 <span aria-hidden="true">→</span>
            </Link>
          </aside>
        </section>
        <DiscoveryTabs />
        <DiscoveryStoryShelves items={[]} />
      </>
    )
  }

  return (
    <>
      <section
        className="discovery-hero"
        aria-labelledby="discovery-title"
        data-cinematic-hero
      >
        <CinematicHeroMotion
          chapter="01 / DISCOVER"
          label="ILOG ORIGINAL SIGNAL"
        />
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
          <p className="discovery-kicker">
            <span /> FEATURED ON ILOG
          </p>
          <p className="discovery-hero-byline">
            {lead.series.title} · {lead.creator.displayName}
          </p>
          <h1 id="discovery-title">{lead.title}</h1>
          <p>
            지금 가장 주목받는 장면을 만나보세요. 보고 난 뒤의 감상은 리뷰로,
            마음에 남은 순간은 하트로 기록할 수 있습니다.
          </p>
          <div className="discovery-hero-meta" aria-label="콘텐츠 정보">
            <span>{lead.ageRating}</span>
            <span>{formatDuration(lead.durationSec)}</span>
            <span>조회 {lead.viewCount}</span>
          </div>
          <div className="discovery-hero-actions">
            <Link href={`/watch/${lead.episodeId}`}>
              <span aria-hidden="true">▶</span> 지금 재생
            </Link>
            <Link href={`/watch/${lead.episodeId}#reviews`}>
              리뷰 보기 <span aria-hidden="true">↗</span>
            </Link>
            <HeroLikeButton
              episodeId={lead.episodeId}
              initialLiked={lead.isLiked}
              initialCount={lead.likeCount}
              authenticated
            />
          </div>
        </div>
        <aside className="discovery-review-panel" aria-label="커뮤니티 리뷰">
          <div className="discovery-review-label">
            <span>COMMUNITY REVIEW</span>
            <small>감상과 대화</small>
          </div>
          <blockquote>“당신은 이 장면을 어떻게 보셨나요?”</blockquote>
          <p>짧은 한 줄도 좋은 리뷰가 됩니다.</p>
          <Link href={`/watch/${lead.episodeId}#reviews`}>
            감상 남기기 <span aria-hidden="true">→</span>
          </Link>
        </aside>
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
      <header className="discovery-topbar">
        <Link
          href="/browse"
          className="discovery-wordmark"
          aria-label="ilog 홈"
        >
          <LeftBrandLogo priority />
        </Link>
        <Form className="discovery-search" action="/search" role="search">
          <SearchIcon />
          <label className="sr-only" htmlFor="discovery-query">
            에피소드 검색
          </label>
          <input
            id="discovery-query"
            name="q"
            placeholder="제목, 시리즈, 크리에이터를 검색하세요"
          />
          <button type="submit">검색</button>
        </Form>
        <div className="discovery-top-actions">
          <div className="discovery-live" aria-label="새 콘텐츠 업데이트 중">
            <span /> LIVE
          </div>
          <BrowseAccountMenu user={session.user} />
        </div>
      </header>
      <Suspense fallback={<DiscoveryFallback />}>
        <PopularDiscovery session={session} />
      </Suspense>
      <DiscoveryCreatorCta />
      <DiscoveryFooter handle={session.user.handle} />
    </div>
  )
}
