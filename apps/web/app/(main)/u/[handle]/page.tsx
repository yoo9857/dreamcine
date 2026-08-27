import { AppError, type SeriesResponse, type UserProfile } from '@aidream/core'
import { Avatar } from '@aidream/ui'
import {
  ArrowDown,
  ArrowUpRight,
  Camera,
  Mail,
  MessageCircle,
  Play,
  Video,
} from 'lucide-react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { ProfilePopularCarousel } from '@/src/components/profile/ProfilePopularCarousel'
import { ShowcaseThemeToggle } from '@/src/components/showcase/ShowcaseThemeToggle'
import { FollowButton } from '@/src/components/social/FollowButton'
import { THEME_COOKIE, parseTheme } from '@/src/lib/theme'
import '@/src/styles/profile-showcase.css'
import { getProfile } from '@/src/services/user/get-profile'
import { getProfileSeries } from '@/src/services/user/get-profile-series'
import {
  getRelatedCreators,
  type RelatedCreator,
} from '@/src/services/user/get-related-creators'

const FALLBACK_POSTERS = [
  '/brand/posters/tomorrow.png',
  '/brand/posters/moon-letter.png',
  '/brand/posters/memory.png',
  '/brand/posters/last-frame.png',
  '/brand/posters/city.png',
] as const

const PREVIEW_TITLES = [
  '내일의 기억',
  '달에게 쓰는 편지',
  '우리가 남긴 계절',
  '마지막 프레임',
  '밤의 도시',
] as const

const PREVIEW_PROFILE: UserProfile = {
  handle: 'hanbin',
  displayName: '한빈',
  bio: '기억에 오래 남는 장면과 사람의 이야기를 만듭니다. 영화와 현실 사이, 아직 이름 붙지 않은 감정을 기록하는 크리에이터입니다.',
  avatarUrl: null,
  followerCount: 12_840,
  seriesCount: 5,
  isFollowing: false,
  isBlocked: false,
}

const PREVIEW_PROFILE_ALIASES: Readonly<Record<string, UserProfile>> = {
  'sora.archive': {
    ...PREVIEW_PROFILE,
    handle: 'sora.archive',
    displayName: '소라',
    bio: '낯선 움직임과 감각적인 색으로 새로운 세계를 기록합니다.',
    avatarUrl: '/brand/profiles/cristobal-valenzuela.jpeg',
    followerCount: 9220,
    seriesCount: 8,
  },
  'minseo.film': {
    ...PREVIEW_PROFILE,
    handle: 'minseo.film',
    displayName: '민서',
    bio: '짧지만 선명한 감정의 순간을 시네마틱 필름으로 전합니다.',
    avatarUrl: '/brand/profiles/minseo-color.webp',
    followerCount: 7810,
    seriesCount: 6,
  },
  'doha.visuals': {
    ...PREVIEW_PROFILE,
    handle: 'doha.visuals',
    displayName: '도하',
    bio: '기술과 상상력이 만나는 비주얼 스토리를 설계합니다.',
    avatarUrl: '/brand/profiles/michael-burns.jpg',
    followerCount: 6340,
    seriesCount: 11,
  },
  'noa.motion': {
    ...PREVIEW_PROFILE,
    handle: 'noa.motion',
    displayName: '노아',
    bio: '리듬과 움직임을 중심으로 한 실험적인 숏폼을 만듭니다.',
    avatarUrl: '/brand/profiles/noa-color.webp',
    followerCount: 5190,
    seriesCount: 7,
  },
  'yoon.frame': {
    ...PREVIEW_PROFILE,
    handle: 'yoon.frame',
    displayName: '윤',
    bio: '사람과 공간 사이의 조용한 서사를 오래 바라봅니다.',
    avatarUrl: '/brand/profiles/james-cameron.jpg',
    followerCount: 4820,
    seriesCount: 4,
  },
}

const PREVIEW_RELATED_CREATORS: readonly RelatedCreator[] = [
  {
    handle: 'sora.archive',
    displayName: '소라',
    avatarUrl: null,
    followerCount: 9220,
    seriesCount: 8,
  },
  {
    handle: 'minseo.film',
    displayName: '민서',
    avatarUrl: null,
    followerCount: 7810,
    seriesCount: 6,
  },
  {
    handle: 'doha.visuals',
    displayName: '도하',
    avatarUrl: null,
    followerCount: 6340,
    seriesCount: 11,
  },
]

const PREVIEW_SERIES: readonly SeriesResponse[] = FALLBACK_POSTERS.map(
  (posterUrl, index) => ({
    id: `preview-${String(index + 1)}`,
    ownerId: 'preview-owner',
    slug: `preview-work-${String(index + 1)}`,
    title: PREVIEW_TITLES.at(index) ?? '이름 없는 작품',
    synopsis: null,
    posterUrl,
    ageRating: 'ALL',
    isCompleted: index < 3,
    commentsOff: false,
    episodeCount: [8, 4, 12, 6, 10][index] ?? 1,
    totalViews: String([284_920, 198_300, 166_420, 98_100, 74_500][index] ?? 0),
    createdAt: '2026-08-26T00:00:00.000Z',
    updatedAt: '2026-08-26T00:00:00.000Z',
  }),
)

function posterFor(series: SeriesResponse, index: number): string {
  return (
    series.posterUrl ??
    FALLBACK_POSTERS.at(index % FALLBACK_POSTERS.length) ??
    '/brand/posters/tomorrow.png'
  )
}

function Corner({
  className = '',
}: {
  readonly className?: string
}): ReactNode {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 18 18"
      width="18"
      height="18"
    >
      <path d="M0 0v18C0 8.059 8.059 0 18 0Z" />
    </svg>
  )
}

function WorkCard({
  series,
  index,
}: {
  readonly series: SeriesResponse
  readonly index: number
}): ReactNode {
  return (
    <article className="profile-work-card">
      <Link href={`/series/${series.id}`} aria-label={`${series.title} 보기`}>
        <div className="profile-work-label">
          <span>{series.title}</span>
          <span className="profile-work-label-arrow">
            <ArrowUpRight aria-hidden="true" />
          </span>
          <Corner className="profile-work-label-corner profile-work-label-corner-bottom" />
          <Corner className="profile-work-label-corner profile-work-label-corner-right" />
        </div>
        <div className="profile-work-image">
          <img src={posterFor(series, index)} alt={`${series.title} 포스터`} />
        </div>
        <div className="profile-work-meta">
          <span>{String(index + 1).padStart(2, '0')}</span>
          <span>{series.episodeCount} EPISODES</span>
        </div>
      </Link>
    </article>
  )
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  return { title: `@${handle}` }
}

export default async function ProfilePage({
  params,
}: {
  readonly params: Promise<{ handle: string }>
}): Promise<ReactNode> {
  const [{ handle }, session, cookieStore] = await Promise.all([
    params,
    getServerSession(),
    cookies(),
  ])
  const currentTheme =
    parseTheme(cookieStore.get(THEME_COOKIE)?.value) ?? 'dark'

  try {
    const previewProfile =
      handle === 'hanbin'
        ? PREVIEW_PROFILE
        : process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL
          ? PREVIEW_PROFILE_ALIASES[handle]
          : undefined
    const isPortfolioPreview = previewProfile !== undefined
    const [profile, series, relatedCreators] = isPortfolioPreview
      ? [previewProfile, PREVIEW_SERIES, PREVIEW_RELATED_CREATORS]
      : await Promise.all([
          getProfile(handle, session),
          getProfileSeries(handle),
          getRelatedCreators(handle),
        ])
    const sortedSeries = [...series].sort(
      (left, right) => Number(right.totalViews) - Number(left.totalViews),
    )
    const isSelf = session?.user.handle === profile.handle
    const messageHref = `mailto:?subject=${encodeURIComponent(`ilog · @${profile.handle}님께 메시지`)}`

    return (
      <div className="profile-showcase">
        <header className="profile-floating-header">
          <nav aria-label="프로필 메뉴">
            <Link href="/" className="profile-wordmark" aria-label="ilog 홈">
              <Play aria-hidden="true" fill="currentColor" />
              <span>ILOG</span>
            </Link>
            <div className="profile-header-links">
              <a href="#popular">인기 작품</a>
              <a href="#works">작품</a>
              <a href="#about">소개</a>
            </div>
            <ShowcaseThemeToggle
              current={currentTheme}
              className="profile-theme-pill"
            />
          </nav>
          <Corner className="profile-corner profile-corner-bottom" />
          <Corner className="profile-corner profile-corner-right" />
        </header>

        <a className="profile-mobile-menu" href="#works">
          <span>Menu</span>
          <Corner className="profile-mobile-corner-bottom" />
          <Corner className="profile-mobile-corner-left" />
        </a>

        <div className="profile-layout">
          <section className="profile-popular-wrap" id="popular">
            <ProfilePopularCarousel
              profileName={profile.displayName}
              items={
                sortedSeries.length === 0
                  ? [
                      {
                        id: 'coming-soon',
                        title: '첫 작품을 준비하고 있어요',
                        image: FALLBACK_POSTERS[0],
                        views: '0',
                      },
                    ]
                  : sortedSeries.slice(0, 5).map((item, index) => ({
                      id: item.id,
                      title: item.title,
                      image: posterFor(item, index),
                      views: item.totalViews,
                      href: `/series/${item.id}`,
                    }))
              }
            />
          </section>

          <div className="profile-right-column">
            <section className="profile-intro-grid" id="about">
              <div className="profile-about-card">
                <div className="profile-identity">
                  <Avatar
                    name={profile.displayName}
                    src={profile.avatarUrl}
                    size="lg"
                    className="profile-avatar"
                  />
                  <div>
                    <h1>{profile.displayName}</h1>
                    <p>@{profile.handle} · FILMMAKER</p>
                  </div>
                </div>
                <p className="profile-bio">
                  {profile.bio ??
                    '장면과 감정 사이의 이야기를 영상으로 기록합니다. 새로운 작품으로 곧 만나요.'}
                </p>
                <div className="profile-stats">
                  <span>{profile.followerCount} FOLLOWERS</span>
                  <span>{profile.seriesCount} WORKS</span>
                </div>
                {isSelf ? null : (
                  <div className="profile-follow">
                    <FollowButton
                      handle={profile.handle}
                      initialFollowing={profile.isFollowing}
                      initialCount={profile.followerCount}
                      disabled={session === null || profile.isBlocked}
                    />
                  </div>
                )}
              </div>

              <div className="profile-link-stack">
                <a
                  href={`https://instagram.com/${profile.handle}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Instagram</span>
                  <span className="profile-link-icon">
                    <Camera aria-hidden="true" />
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                </a>
                <a
                  href={`https://youtube.com/@${profile.handle}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>YouTube</span>
                  <span className="profile-link-icon">
                    <Video aria-hidden="true" />
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                </a>
                <a href="#contact">
                  <span>Contact me</span>
                  <span className="profile-link-icon">
                    <Mail aria-hidden="true" />
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                </a>
                <a className="profile-message-link" href={messageHref}>
                  <span>Message</span>
                  <span className="profile-link-icon">
                    <MessageCircle aria-hidden="true" />
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                </a>
              </div>
            </section>

            <section className="profile-works" id="works">
              <header className="profile-section-bar">
                <div>
                  <span>작품</span>
                  <ArrowDown aria-hidden="true" />
                </div>
                <span>{series.length} PROJECTS</span>
              </header>
              {series.length === 0 ? (
                <div className="profile-empty-work">
                  <p>NEXT STORY</p>
                  <h2>새로운 작품을 준비하고 있습니다.</h2>
                </div>
              ) : (
                <div className="profile-work-grid">
                  {series.map((item, index) => (
                    <WorkCard key={item.id} series={item} index={index} />
                  ))}
                </div>
              )}
            </section>

            <footer className="profile-footer" id="contact">
              <div className="profile-related-heading">
                <p>EXPLORE MORE CREATORS</p>
                <h2>비슷한 다른 작가의 작품 보기</h2>
              </div>

              <div className="profile-related-list">
                {relatedCreators.map((creator, index) => (
                  <Link key={creator.handle} href={`/u/${creator.handle}`}>
                    <span className="profile-related-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Avatar
                      name={creator.displayName}
                      src={creator.avatarUrl}
                      size="lg"
                      className="profile-related-avatar"
                    />
                    <span className="profile-related-name">
                      <strong>{creator.displayName}</strong>
                      <small>@{creator.handle}</small>
                    </span>
                    <span className="profile-related-stats">
                      {creator.seriesCount} WORKS · {creator.followerCount}{' '}
                      FOLLOWERS
                    </span>
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                ))}
              </div>

              <div className="profile-related-bottom">
                <small>
                  © {new Date().getFullYear()} ILOG CREATOR PROFILE
                </small>
                <Link href="/search">
                  <span>모든 작가 둘러보기</span>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </div>
            </footer>
          </div>
        </div>
      </div>
    )
  } catch (error: unknown) {
    if (error instanceof AppError && error.code === 'E_USER_NOT_FOUND') {
      notFound()
    }
    throw error
  }
}
