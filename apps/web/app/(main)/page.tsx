import Image from 'next/image'
import Link from 'next/link'
import { Clapperboard, Compass, Heart } from 'lucide-react'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'
import { DiscoveryBackdrop } from '@/src/components/discovery/DiscoveryBackdrop'
import { GuestCoverflow } from '@/src/components/discovery/GuestCoverflow'
import { IndustryPerspectives } from '@/src/components/discovery/IndustryPerspectives'
import { getFeed } from '@/src/services/feed/get-feed'

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

/**
 * 비회원 공개 랜딩은 `/` 하나만 유지한다. 검수용 또는 캠페인용 화면도 별도
 * 랜딩 라우트로 복제하지 않고 이 컴포넌트의 섹션으로 통합한다.
 */
interface LandingHero {
  readonly episodeId: string
  readonly thumbUrl: string | null
}

async function getLandingHero(): Promise<LandingHero | null> {
  if (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL) {
    return null
  }

  try {
    const page = await getFeed({ type: 'popular', limit: 1 }, null)
    const lead = page.items[0]
    return lead === undefined
      ? null
      : { episodeId: lead.episodeId, thumbUrl: lead.thumbUrl }
  } catch {
    // The landing page must remain available during a media or database outage.
    return null
  }
}

function GuestLanding({
  hero,
}: {
  readonly hero: LandingHero | null
}): ReactNode {
  return (
    <div className="guest-landing-content" id="guest-top">
      <section className="guest-hero" aria-labelledby="guest-title">
        {hero?.thumbUrl === null || hero === null ? (
          <div className="guest-hero-art" aria-hidden="true" />
        ) : (
          <Image
            src={hero.thumbUrl}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="guest-hero-image"
          />
        )}
        {hero === null ? null : (
          <DiscoveryBackdrop episodeId={hero.episodeId} loadOnMobile />
        )}
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
        <GuestCoverflow items={landingPreviewItems} />
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

  if (session !== null) {
    redirect('/browse')
  }

  const hero = await getLandingHero()

  return (
    <div className="guest-landing">
      <GuestLanding hero={hero} />
    </div>
  )
}
