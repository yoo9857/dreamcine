import { EmptyState } from '@aidream/ui'
import Form from 'next/form'
import Image from 'next/image'
import Link from 'next/link'
import { Clapperboard, Compass, Heart } from 'lucide-react'
import { Suspense, type ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import type { RouteSession } from '@/src/auth/types'
import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'
import { DiscoveryBackdrop } from '@/src/components/discovery/DiscoveryBackdrop'
import { GuestCoverflow } from '@/src/components/discovery/GuestCoverflow'
import { HolographicBeams } from '@/src/components/discovery/HolographicBeams'
import { HeroLikeButton } from '@/src/components/discovery/HeroLikeButton'
import { IndustryPerspectives } from '@/src/components/discovery/IndustryPerspectives'
import { FeedList } from '@/src/components/feed/FeedList'
import { FeedSkeleton } from '@/src/components/feed/FeedSkeleton'
import { CinematicHeroMotion } from '@/src/components/motion/CinematicHeroMotion'
import { getFeed } from '@/src/services/feed/get-feed'
import { getLogger } from '@/src/lib/logger'

const discoveryTabs = [
  { href: '/', label: '전체', active: true },
  { href: '/search', label: '새로 올라온' },
  { href: '/following', label: '팔로잉' },
  { href: '/search?q=드라마', label: '드라마' },
  { href: '/search?q=예능', label: '예능' },
  { href: '/search?q=음악', label: '뮤직' },
  { href: '/search?q=다큐', label: '다큐멘터리' },
  { href: '/search?q=숏폼', label: '숏폼' },
] as const

const landingPreviewItems = [
  {
    episodeId: 'preview-memory',
    href: '/signup',
    title: '기억의 온도',
    creatorName: 'AI DRAMA · ILOG PREVIEW',
    thumbnailUrl: '/brand/posters/memory.png',
  },
  {
    episodeId: 'preview-city',
    href: '/signup',
    title: '사라진 도시의 밤',
    creatorName: 'AI CINEMA · ILOG PREVIEW',
    thumbnailUrl: '/brand/posters/city.png',
  },
  {
    episodeId: 'preview-moon',
    href: '/signup',
    title: '달 너머의 편지',
    creatorName: 'AI SHORT · ILOG PREVIEW',
    thumbnailUrl: '/brand/posters/moon-letter.png',
  },
  {
    episodeId: 'preview-frame',
    href: '/signup',
    title: '마지막 프레임',
    creatorName: 'AI FILM · ILOG PREVIEW',
    thumbnailUrl: '/brand/posters/last-frame.png',
  },
  {
    episodeId: 'preview-tomorrow',
    href: '/signup',
    title: '우리가 만든 내일',
    creatorName: 'AI SERIES · ILOG PREVIEW',
    thumbnailUrl: '/brand/posters/tomorrow.png',
  },
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

async function PopularDiscovery({
  session,
}: {
  readonly session: RouteSession
}): Promise<ReactNode> {
  const page = await getFeed({ type: 'popular', limit: 20 }, session)
  const lead = page.items[0]
  if (lead === undefined) {
    return (
      <div className="discovery-empty-hero">
        <div>
          <span>YOUR STORY STARTS HERE</span>
          <h1>
            첫 번째 이야기를
            <br />
            기다리고 있어요.
          </h1>
          <p>새로운 에피소드가 공개되면 가장 먼저 이곳에서 소개합니다.</p>
          <Link href="/studio">
            첫 작품 업로드하기 <b>↗</b>
          </Link>
        </div>
        <EmptyState
          title="아직 공개된 에피소드가 없습니다"
          description="새로운 이야기가 공개되면 이곳에 표시됩니다."
        />
      </div>
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

      <section className="discovery-feed" aria-labelledby="popular-title">
        <div className="discovery-feed-heading">
          <div>
            <span>TRENDING NOW</span>
            <h2 id="popular-title">지금 가장 많이 보는 이야기</h2>
          </div>
          <Link href="/search">
            전체 탐색 <span aria-hidden="true">→</span>
          </Link>
        </div>
        <FeedList
          type="popular"
          initialItems={page.items}
          initialCursor={page.nextCursor}
          priorityFirst={false}
        />
      </section>
    </>
  )
}

/**
 * 비회원 공개 랜딩은 `/` 하나만 유지한다. 검수용 또는 캠페인용 화면도 별도
 * 랜딩 라우트로 복제하지 않고 이 컴포넌트의 섹션으로 통합한다.
 */
async function GuestTrendingCoverflow(): Promise<ReactNode> {
  const page = await getFeed({ type: 'popular', limit: 10 }, null).catch(
    (error: unknown) => {
      getLogger().warn(
        { err: error },
        'guest feed unavailable; rendering static landing',
      )
      return { items: [], nextCursor: null }
    },
  )

  return (
    <GuestCoverflow
      items={
        page.items.length === 0
          ? landingPreviewItems
          : page.items.map((item) => ({
              episodeId: item.episodeId,
              title: item.title,
              creatorName: item.creator.displayName,
              thumbnailUrl: item.thumbUrl,
            }))
      }
    />
  )
}

function GuestLanding(): ReactNode {
  return (
    <div className="guest-landing-content" id="guest-top">
      <section
        className="guest-hero"
        aria-labelledby="guest-title"
        data-cinematic-hero
      >
        <CinematicHeroMotion
          chapter="01 / PREMIERE"
          label="STORIES BEYOND THE FRAME"
          tone="lime"
        />
        <Image
          src="/brand/posters/memory.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="guest-hero-image"
        />
        <div className="guest-hero-shade" />
        <header className="guest-header">
          <Link href="/" className="guest-wordmark" aria-label="ilog 홈">
            <LeftBrandLogo priority />
          </Link>
          <nav aria-label="회원 메뉴">
            <Link href="/login">로그인</Link>
            <Link href="/signup">무료로 시작하기</Link>
          </nav>
        </header>
        <div className="guest-hero-copy">
          <p>WATCH · CREATE · CONNECT</p>
          <h1 id="guest-title">
            이야기가 시작되고,
            <br />
            취향이 연결되는 곳.
          </h1>
          <p>
            새로운 영상을 발견하고, 크리에이터를 팔로우하고,
            <br />
            당신만의 이야기도 세상에 공개하세요.
          </p>
          <div className="guest-hero-actions">
            <Link href="/signup">
              지금 무료로 시작하기 <span aria-hidden="true">→</span>
            </Link>
            <Link href="/login">이미 계정이 있어요</Link>
          </div>
          <small>가입은 무료이며 언제든 바로 시작할 수 있습니다.</small>
          <HolographicBeams
            className="guest-hero-beams"
            density={15}
            speed={1.5}
            aberration={3}
            opacity={90}
          />
        </div>
      </section>

      <section
        className="guest-benefits"
        aria-labelledby="guest-benefits-title"
      >
        <div className="guest-section-heading">
          <p>WHY ILOG</p>
          <h2 id="guest-benefits-title">
            보는 사람과 만드는 사람이 함께 자랍니다.
          </h2>
          <p>
            흥미로운 영상을 발견하는 순간부터 나만의 작품을 공개하는 순간까지
            하나의 흐름으로 연결됩니다.
          </p>
        </div>
        <div className="guest-benefit-grid">
          <article>
            <Compass className="guest-benefit-icon" aria-hidden="true" />
            <span>01</span>
            <small>DISCOVER</small>
            <h3>취향에 맞는 발견</h3>
            <p>지금 뜨는 이야기부터 새로운 크리에이터까지 한곳에서 만나요.</p>
          </article>
          <article>
            <Heart className="guest-benefit-icon" aria-hidden="true" />
            <span>02</span>
            <small>REACT</small>
            <h3>반응이 이어지는 감상</h3>
            <p>좋아요와 리뷰로 마음에 남은 장면을 기록하고 나눠요.</p>
          </article>
          <article>
            <Clapperboard className="guest-benefit-icon" aria-hidden="true" />
            <span>03</span>
            <small>CREATE</small>
            <h3>누구나 시작하는 창작</h3>
            <p>당신의 첫 번째 에피소드를 업로드하고 팬을 만나보세요.</p>
          </article>
        </div>
        <Link href="/signup">ilog 시작하기 →</Link>
      </section>

      <section
        className="guest-trending"
        aria-labelledby="guest-trending-title"
      >
        <div className="guest-section-heading">
          <p>EXPLORE BEFORE YOU JOIN</p>
          <h2 id="guest-trending-title">지금 ilog에서 주목받는 이야기</h2>
          <p>
            새로운 취향을 발견하는 가장 빠른 방법, 지금 많이 보는 장면부터
            만나보세요.
          </p>
        </div>
        <Suspense fallback={<GuestCoverflow items={landingPreviewItems} />}>
          <GuestTrendingCoverflow />
        </Suspense>
      </section>

      <IndustryPerspectives />

      <section className="guest-final-cta" aria-labelledby="guest-cta-title">
        <p>YOUR NEXT SCENE STARTS HERE</p>
        <h2 id="guest-cta-title">다음 장면의 주인공은 당신입니다.</h2>
        <p>보고, 남기고, 만드는 모든 순간을 ilog에서 시작하세요.</p>
        <div>
          <Link href="/signup">
            무료로 시작하기 <span aria-hidden="true">→</span>
          </Link>
          <Link href="/login">이미 계정이 있어요</Link>
        </div>
      </section>

      <footer className="guest-footer" aria-label="사이트 푸터">
        <div className="guest-footer-main">
          <section className="guest-footer-brand" aria-label="ilog 소개">
            <Link href="/" className="guest-wordmark" aria-label="ilog 홈">
              <LeftBrandLogo />
            </Link>
            <h2>이야기가 스크린이 되는 곳.</h2>
            <p>
              새로운 영상을 발견하고, 마음에 남은 장면을 나누고,
              <br />
              당신만의 작품을 세상에 공개하세요.
            </p>
            <span>WATCH · CREATE · CONNECT</span>
          </section>

          <nav className="guest-footer-links" aria-label="푸터 메뉴">
            <section>
              <h3>둘러보기</h3>
              <Link href="/">주목받는 이야기</Link>
              <Link href="/search">검색</Link>
              <Link href="/following">팔로잉</Link>
            </section>
            <section>
              <h3>크리에이터</h3>
              <Link href="/about">About ilog</Link>
              <Link href="/creator-apply">크리에이터 모집</Link>
              <Link href="/studio">스튜디오</Link>
              <Link href="/studio/series/new">새 시리즈 만들기</Link>
              <Link href="/studio/upload">에피소드 업로드</Link>
              <Link href="/ads-plan">광고형 멤버십</Link>
            </section>
            <section>
              <h3>계정 · 지원</h3>
              <Link href="/signup">무료 회원가입</Link>
              <Link href="/login">로그인</Link>
              <a href="mailto:support@ilog.kr">고객센터</a>
              <a href="mailto:privacy@ilog.kr">개인정보 문의</a>
            </section>
          </nav>
        </div>

        <div className="guest-footer-bottom">
          <p>© 2026 ilog. All rights reserved.</p>
          <p>AI-native video community for watchers and creators.</p>
          <a href="#guest-top">
            처음으로 <span aria-hidden="true">↑</span>
          </a>
        </div>
      </footer>
    </div>
  )
}

export default async function HomePage(): Promise<ReactNode> {
  const session = await getServerSession()

  if (session === null) {
    return (
      <div className="guest-landing">
        <GuestLanding />
      </div>
    )
  }

  return (
    <div className="discovery-home">
      <header className="discovery-topbar">
        <Link href="/" className="discovery-wordmark" aria-label="ilog 홈">
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
        <div className="discovery-live" aria-label="새 콘텐츠 업데이트 중">
          <span /> LIVE
        </div>
      </header>
      <Suspense fallback={<DiscoveryFallback />}>
        <PopularDiscovery session={session} />
      </Suspense>
    </div>
  )
}
