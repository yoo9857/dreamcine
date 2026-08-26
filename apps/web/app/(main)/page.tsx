import { EmptyState } from '@aidream/ui'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'

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

async function PopularDiscovery(): Promise<ReactNode> {
  // 공개 피드는 세션과 분리해 스트리밍한다. 히어로와 피드 모두 같은 조회를
  // 사용해 첫 화면 때문에 DB를 한 번 더 읽거나 개인화 캐시를 깨지 않는다.
  const page = await getFeed({ type: 'popular', limit: 20 }, null)
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
        <div className="discovery-hero-shade" />
        <div className="discovery-hero-copy">
          <p className="discovery-kicker">
            <span /> AIDREAM ORIGINALS
          </p>
          <h1 id="discovery-title">
            취향이 열리는
            <br />
            순간, <em>ilog.</em>
          </h1>
          <p>
            크리에이터의 새로운 시선과 당신이 오래 기억할 장면을 한곳에서. 지금
            가장 주목받는 이야기를 만나보세요.
          </p>
          <div className="discovery-hero-actions">
            <Link href={`/watch/${lead.episodeId}`}>
              지금 재생 <span aria-hidden="true">▶</span>
            </Link>
            <Link href="/search">더 둘러보기</Link>
          </div>
        </div>
        <article className="discovery-feature-card">
          <div>
            <span>지금 뜨는 에피소드</span>
            <h2>{lead.title}</h2>
            <p>
              {lead.series.title} · {lead.creator.displayName}
            </p>
          </div>
          <Link
            href={`/watch/${lead.episodeId}`}
            aria-label={`${lead.title} 재생`}
          >
            <span>{formatDuration(lead.durationSec)}</span>
            <b aria-hidden="true">▶</b>
          </Link>
        </article>
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

      <section className="discovery-pathways" aria-label="추천 탐색 경로">
        <Link
          href={`/watch/${lead.episodeId}`}
          className="discovery-pathway discovery-pathway-featured"
        >
          {lead.thumbUrl === null ? null : (
            <Image
              src={lead.thumbUrl}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 767px) 84vw, 40vw"
            />
          )}
          <span className="discovery-pathway-shade" />
          <span className="discovery-pathway-index">01</span>
          <span className="discovery-pathway-copy">
            <small>EDITOR&apos;S PICK</small>
            <strong>{lead.title}</strong>
            <em>
              바로 재생 <b aria-hidden="true">↗</b>
            </em>
          </span>
        </Link>
        <Link
          href="/search"
          className="discovery-pathway discovery-pathway-new"
        >
          <span className="discovery-pathway-orbit" aria-hidden="true" />
          <span className="discovery-pathway-index">02</span>
          <span className="discovery-pathway-copy">
            <small>FIND SOMETHING NEW</small>
            <strong>새로운 장면을 발견하세요.</strong>
            <em>
              전체 콘텐츠 탐색 <b aria-hidden="true">→</b>
            </em>
          </span>
        </Link>
        <Link
          href="/studio"
          className="discovery-pathway discovery-pathway-studio"
        >
          <span className="discovery-pathway-play" aria-hidden="true">
            ▶
          </span>
          <span className="discovery-pathway-index">03</span>
          <span className="discovery-pathway-copy">
            <small>CREATE ON ILOG</small>
            <strong>당신의 이야기를 시작하세요.</strong>
            <em>
              크리에이터 스튜디오 <b aria-hidden="true">→</b>
            </em>
          </span>
        </Link>
      </section>

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

export default function HomePage(): ReactNode {
  return (
    <div className="discovery-home">
      <header className="discovery-topbar">
        <Link href="/" className="discovery-wordmark" aria-label="ilog 홈">
          <b>i</b>log<span>.</span>
        </Link>
        <form className="discovery-search" action="/search" role="search">
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
        </form>
        <div className="discovery-live" aria-label="새 콘텐츠 업데이트 중">
          <span /> LIVE
        </div>
      </header>
      <Suspense fallback={<DiscoveryFallback />}>
        <PopularDiscovery />
      </Suspense>
    </div>
  )
}
