import { EmptyState } from '@aidream/ui'
import Form from 'next/form'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import type { RouteSession } from '@/src/auth/types'
import { DiscoveryBackdrop } from '@/src/components/discovery/DiscoveryBackdrop'
import { HeroLikeButton } from '@/src/components/discovery/HeroLikeButton'
import { FeedList } from '@/src/components/feed/FeedList'
import { FeedSkeleton } from '@/src/components/feed/FeedSkeleton'
import { getFeed } from '@/src/services/feed/get-feed'

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
      <section className="discovery-hero" aria-labelledby="discovery-title">
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

async function GuestLanding(): Promise<ReactNode> {
  const page = await getFeed({ type: 'popular', limit: 10 }, null)
  const lead = page.items[0]

  return (
    <div className="guest-landing-content">
      <section className="guest-hero" aria-labelledby="guest-title">
        {lead?.thumbUrl === undefined || lead.thumbUrl === null ? (
          <div className="guest-hero-art" aria-hidden="true" />
        ) : (
          <Image
            src={lead.thumbUrl}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="guest-hero-image"
          />
        )}
        {lead === undefined ? null : (
          <DiscoveryBackdrop episodeId={lead.episodeId} />
        )}
        <div className="guest-hero-shade" />
        <header className="guest-header">
          <Link href="/" className="guest-wordmark" aria-label="ilog 홈">
            <Image
              src="/brand/ilog-app-icon.png"
              alt=""
              width={36}
              height={36}
              unoptimized
              className="brand-app-icon"
            />
            <span className="brand-wordmark-label">
              <b>i</b>log<i>.</i>
            </span>
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
        </div>
      </section>

      {page.items.length === 0 ? null : (
        <section
          className="guest-trending"
          aria-labelledby="guest-trending-title"
        >
          <div>
            <p>EXPLORE BEFORE YOU JOIN</p>
            <h2 id="guest-trending-title">지금 ilog에서 주목받는 이야기</h2>
          </div>
          <div className="guest-trending-row">
            {page.items.slice(0, 6).map((item, index) => (
              <article key={item.episodeId}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <Link href={`/watch/${item.episodeId}`}>
                  <div>
                    {item.thumbUrl === null ? null : (
                      <Image
                        src={item.thumbUrl}
                        alt=""
                        fill
                        unoptimized
                        sizes="(max-width: 767px) 70vw, 25vw"
                      />
                    )}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.creator.displayName}</p>
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <section
        className="guest-benefits"
        aria-labelledby="guest-benefits-title"
      >
        <div>
          <p>WHY ILOG</p>
          <h2 id="guest-benefits-title">
            보는 사람과 만드는 사람이 함께 자랍니다.
          </h2>
        </div>
        <div className="guest-benefit-grid">
          <article>
            <span>01</span>
            <h3>취향에 맞는 발견</h3>
            <p>지금 뜨는 이야기부터 새로운 크리에이터까지 한곳에서 만나요.</p>
          </article>
          <article>
            <span>02</span>
            <h3>반응이 이어지는 감상</h3>
            <p>좋아요와 리뷰로 마음에 남은 장면을 기록하고 나눠요.</p>
          </article>
          <article>
            <span>03</span>
            <h3>누구나 시작하는 창작</h3>
            <p>당신의 첫 번째 에피소드를 업로드하고 팬을 만나보세요.</p>
          </article>
        </div>
        <Link href="/signup">ilog 시작하기 →</Link>
      </section>

      <footer className="guest-footer">
        <Link href="/" className="guest-wordmark">
          <Image
            src="/brand/ilog-app-icon.png"
            alt=""
            width={36}
            height={36}
            unoptimized
            className="brand-app-icon"
          />
          <span className="brand-wordmark-label">
            <b>i</b>log<i>.</i>
          </span>
        </Link>
        <p>이야기가 스크린이 되는 곳.</p>
        <div>
          <Link href="/login">로그인</Link>
          <Link href="/signup">회원가입</Link>
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
        <Suspense
          fallback={
            <section className="guest-hero guest-hero-loading">
              <div className="guest-hero-art" aria-hidden="true" />
              <div className="guest-hero-shade" />
              <div className="guest-hero-copy">
                <p>WATCH · CREATE · CONNECT</p>
                <h1>이야기가 시작되는 곳.</h1>
              </div>
            </section>
          }
        >
          <GuestLanding />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="discovery-home">
      <header className="discovery-topbar">
        <Link href="/" className="discovery-wordmark" aria-label="ilog 홈">
          <Image
            src="/brand/ilog-app-icon.png"
            alt=""
            width={34}
            height={34}
            unoptimized
            className="brand-app-icon"
          />
          <span className="brand-wordmark-label">
            <b>i</b>log<i>.</i>
          </span>
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
