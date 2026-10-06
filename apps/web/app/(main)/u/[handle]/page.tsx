import {
  AppError,
  type SeriesResponse,
  type UserLink,
  type UserProfile,
} from '@aidream/core'
import { Avatar, TierBadge } from '@aidream/ui'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Globe,
  Link2,
  Mail,
  PencilLine,
  Play,
  UserPlus,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { DiscoveryFooter } from '@/src/components/discovery/DiscoveryFooter'
import { DiscoveryTopbar } from '@/src/components/discovery/DiscoveryTopbar'
import { ProfileShareButton } from '@/src/components/profile/ProfileShareButton'
import { JsonLd } from '@/src/components/seo/JsonLd'
import { FollowButton } from '@/src/components/social/FollowButton'
import { workTypeLabel } from '@/src/components/studio/work-types'
import { profileJsonLd } from '@/src/lib/seo/json-ld'
import { absoluteUrlOrNull } from '@/src/lib/site-url'
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
  channelDescription: null,
  avatarUrl: null,
  bannerUrl: null,
  channelKeywords: ['AI 드라마', '단편', '감성'],
  country: 'KR',
  locale: 'ko-KR',
  isVerified: true,
  role: 'CREATOR',
  tier: 'GOLD',
  tierPoints: 18_400,
  followerCount: 12_840,
  followingCount: 42,
  seriesCount: 5,
  episodeCount: 23,
  totalViews: '184200',
  joinedAt: new Date('2026-02-01T00:00:00.000Z'),
  trailerEpisodeId: null,
  links: [],
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
    tier: 'GOLD',
    isVerified: true,
    followerCount: 9220,
    seriesCount: 8,
  },
  'minseo.film': {
    ...PREVIEW_PROFILE,
    handle: 'minseo.film',
    displayName: '민서',
    bio: '짧지만 선명한 감정의 순간을 시네마틱 필름으로 전합니다.',
    avatarUrl: '/brand/profiles/minseo-color.webp',
    tier: 'GOLD',
    isVerified: true,
    followerCount: 7810,
    seriesCount: 6,
  },
  'doha.visuals': {
    ...PREVIEW_PROFILE,
    handle: 'doha.visuals',
    displayName: '도하',
    bio: '기술과 상상력이 만나는 비주얼 스토리를 설계합니다.',
    avatarUrl: '/brand/profiles/michael-burns.jpg',
    tier: 'GOLD',
    isVerified: true,
    followerCount: 6340,
    seriesCount: 11,
  },
  'noa.motion': {
    ...PREVIEW_PROFILE,
    handle: 'noa.motion',
    displayName: '노아',
    bio: '리듬과 움직임을 중심으로 한 실험적인 숏폼을 만듭니다.',
    avatarUrl: '/brand/profiles/noa-color.webp',
    tier: 'GOLD',
    isVerified: true,
    followerCount: 5190,
    seriesCount: 7,
  },
  'yoon.frame': {
    ...PREVIEW_PROFILE,
    handle: 'yoon.frame',
    displayName: '윤',
    bio: '사람과 공간 사이의 조용한 서사를 오래 바라봅니다.',
    avatarUrl: '/brand/profiles/james-cameron.jpg',
    tier: 'GOLD',
    isVerified: true,
    followerCount: 4820,
    seriesCount: 4,
  },
}

const PREVIEW_RELATED_CREATORS: readonly RelatedCreator[] = [
  {
    handle: 'sora.archive',
    displayName: '소라',
    avatarUrl: null,
    tier: 'GOLD',
    isVerified: true,
    followerCount: 9220,
    seriesCount: 8,
  },
  {
    handle: 'minseo.film',
    displayName: '민서',
    avatarUrl: null,
    tier: 'GOLD',
    isVerified: true,
    followerCount: 7810,
    seriesCount: 6,
  },
  {
    handle: 'doha.visuals',
    displayName: '도하',
    avatarUrl: null,
    tier: 'GOLD',
    isVerified: true,
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
    workType: 'SERIES',
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

const COMPACT = new Intl.NumberFormat('ko-KR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** 1.2만, 3,400 처럼 한국어 단위로 줄인다. 조회수는 문자열(BigInt)로 온다. */
function compact(value: number | string): string {
  const number = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(number) ? COMPACT.format(number) : '0'
}

const JOINED = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  timeZone: 'Asia/Seoul',
})

function linkHref(link: UserLink): string {
  return link.kind === 'EMAIL' && !link.url.startsWith('mailto:')
    ? `mailto:${link.url}`
    : link.url
}

function LinkIcon({ kind }: { readonly kind: UserLink['kind'] }): ReactNode {
  if (kind === 'EMAIL') return <Mail aria-hidden="true" />
  if (kind === 'WEBSITE') return <Globe aria-hidden="true" />
  return <Link2 aria-hidden="true" />
}

/**
 * 롱폼 포스터는 16:9, 숏폼은 9:16 으로 올라온다(SeriesPosterUploader).
 * 예전 카드는 모든 포스터를 세로로 잘라 화면 하나에 두 편만 보였다.
 */
function WorkCard({
  series,
  index,
  featured = false,
}: {
  readonly series: SeriesResponse
  readonly index: number
  readonly featured?: boolean
}): ReactNode {
  const vertical = series.workType === 'SHORT_FORM'
  const className = [
    'cp-card',
    vertical ? 'is-vertical' : '',
    featured ? 'is-featured' : '',
  ]
    .filter((name) => name !== '')
    .join(' ')
  return (
    <li className={className}>
      <Link href={`/series/${series.id}`}>
        <span className="cp-card-media">
          <img
            src={posterFor(series, index)}
            alt=""
            loading={index < 4 ? 'eager' : 'lazy'}
            decoding="async"
          />
          <span className="cp-card-badges">
            {featured ? <span className="is-hot">인기 1위</span> : null}
            <span>{workTypeLabel(series.workType)}</span>
            {series.isCompleted ? <span>완결</span> : null}
          </span>
          <span className="cp-card-play" aria-hidden="true">
            <Play fill="currentColor" />
          </span>
        </span>
        <span className="cp-card-copy">
          <strong>{series.title}</strong>
          {featured && series.synopsis !== null ? (
            <span className="cp-card-synopsis">{series.synopsis}</span>
          ) : null}
          <small>
            {series.episodeCount}화 · 조회 {compact(series.totalViews)}
          </small>
        </span>
      </Link>
    </li>
  )
}

function RelatedCreatorCard({
  creator,
}: {
  readonly creator: RelatedCreator
}): ReactNode {
  return (
    <li>
      <Link href={`/u/${creator.handle}`} className="cp-related-card">
        <Avatar
          name={creator.displayName}
          src={creator.avatarUrl}
          size="lg"
          className="cp-related-avatar"
        />
        <span>
          <strong>
            {creator.displayName}
            {creator.isVerified ? (
              <BadgeCheck role="img" aria-label="인증 채널" />
            ) : null}
          </strong>
          <small>
            작품 {creator.seriesCount}편 · 팔로워{' '}
            {compact(creator.followerCount)}
          </small>
        </span>
        <ArrowRight aria-hidden="true" />
      </Link>
    </li>
  )
}

/**
 * 프로필 메타데이터.
 *
 * DB 조회가 실패하거나 핸들이 없으면 핸들만 담은 최소 메타로 떨어진다.
 * 메타데이터 실패가 페이지 실패가 되면 안 된다.
 */
export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const canonical = absoluteUrlOrNull(`/u/${handle}`)

  let profile: UserProfile | null = null
  try {
    profile = await getProfile(handle, null)
  } catch {
    profile = null
  }
  if (profile === null) {
    return {
      title: `@${handle}`,
      robots: { index: false, follow: true },
      ...(canonical === null ? {} : { alternates: { canonical } }),
    }
  }

  const description =
    profile.channelDescription ??
    profile.bio ??
    `${profile.displayName}(@${profile.handle})의 작품 ${String(profile.seriesCount)}편`
  const title = `${profile.displayName} (@${profile.handle})`

  return {
    title,
    description,
    keywords:
      profile.channelKeywords.length === 0
        ? undefined
        : [...profile.channelKeywords],
    ...(canonical === null ? {} : { alternates: { canonical } }),
    robots: { index: true, follow: true },
    openGraph: {
      type: 'profile',
      title,
      description,
      siteName: 'ilog',
      locale: profile.locale,
      ...(canonical === null ? {} : { url: canonical }),
      ...(profile.bannerUrl === null
        ? profile.avatarUrl === null
          ? {}
          : { images: [{ url: profile.avatarUrl }] }
        : { images: [{ url: profile.bannerUrl }] }),
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function ProfilePage({
  params,
}: {
  readonly params: Promise<{ handle: string }>
}): Promise<ReactNode> {
  const [{ handle }, session] = await Promise.all([params, getServerSession()])

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
    const isSelf = session?.user.handle === profile.handle

    // 숫자는 이 화면에 실제로 보이는 공개 작품에서 센다. 프로필 집계는 비공개
    // 작품까지 세어 "작품 9편" 아래에 6편만 보이는 어긋남을 만들었다.
    const byViews = [...series].sort(
      (left, right) => Number(right.totalViews) - Number(left.totalViews),
    )
    const longFormByDate = series.filter(
      (item) => item.workType !== 'SHORT_FORM',
    )
    // 가장 많이 본 롱폼을 그리드 첫 칸에 2x2 로 키운다. 따로 큰 영역을 두면
    // 노트북 첫 화면이 그것으로 차서 다른 작품이 보이지 않는다.
    const featured =
      longFormByDate.length >= 3
        ? byViews.find((item) => item.workType !== 'SHORT_FORM')
        : undefined
    const longForm =
      featured === undefined
        ? longFormByDate
        : [featured, ...longFormByDate.filter((item) => item !== featured)]
    const shortForm = series.filter((item) => item.workType === 'SHORT_FORM')
    const episodeTotal = series.reduce(
      (sum, item) => sum + item.episodeCount,
      0,
    )
    const heroImage =
      profile.bannerUrl ??
      (byViews[0] === undefined
        ? FALLBACK_POSTERS[0]
        : posterFor(byViews[0], 0))
    const links = [...profile.links].sort(
      (left, right) => left.order - right.order,
    )

    return (
      <div className="creator-page" id="discovery-top">
        <JsonLd
          document={profileJsonLd({
            handle: profile.handle,
            displayName: profile.displayName,
            description: profile.channelDescription ?? profile.bio,
            avatarUrl: profile.avatarUrl,
            followerCount: profile.followerCount,
            joinedAt: profile.joinedAt,
          })}
        />
        <DiscoveryTopbar user={session?.user ?? null} />

        <main className="cp">
          <section className="cp-hero" aria-labelledby="cp-name">
            <div className="cp-hero-art" aria-hidden="true">
              <img src={heroImage} alt="" fetchPriority="high" />
            </div>

            <div className="cp-hero-inner">
              <Avatar
                name={profile.displayName}
                src={profile.avatarUrl}
                size="lg"
                className="cp-avatar"
              />

              <div className="cp-identity">
                <h1 id="cp-name">
                  {profile.displayName}
                  {profile.isVerified ? (
                    <BadgeCheck
                      className="cp-verified"
                      role="img"
                      aria-label="인증 채널"
                    />
                  ) : null}
                </h1>
                <p className="cp-handle">
                  <span>@{profile.handle}</span>
                  <TierBadge tier={profile.tier} size="sm" />
                  <span className="cp-joined">
                    <CalendarDays aria-hidden="true" />
                    {JOINED.format(profile.joinedAt)} 가입
                  </span>
                </p>
                <p className="cp-bio">
                  {profile.bio ??
                    profile.channelDescription ??
                    '장면과 감정 사이의 이야기를 영상으로 기록합니다.'}
                </p>
                {profile.channelKeywords.length === 0 ? null : (
                  <ul className="cp-tags" aria-label="채널 키워드">
                    {profile.channelKeywords.map((keyword) => (
                      <li key={keyword}>#{keyword}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="cp-actions">
                {isSelf ? (
                  <Link href="/account#profile" className="cp-manage">
                    <PencilLine aria-hidden="true" />
                    프로필 관리
                  </Link>
                ) : session === null ? (
                  // 비활성 버튼은 고장처럼 보인다. 로그인 후 이 화면으로 돌아온다.
                  <Link
                    href={`/login?next=${encodeURIComponent(`/u/${profile.handle}`)}`}
                    className="cp-follow-login"
                  >
                    <UserPlus aria-hidden="true" />
                    팔로우
                  </Link>
                ) : (
                  <div className="cp-follow">
                    <FollowButton
                      handle={profile.handle}
                      initialFollowing={profile.isFollowing}
                      initialCount={profile.followerCount ?? 0}
                      disabled={profile.isBlocked}
                    />
                  </div>
                )}
                <ProfileShareButton
                  title={`${profile.displayName} (@${profile.handle}) · ilog`}
                />
              </div>
            </div>

            <div className="cp-hero-foot">
              <dl className="cp-stats">
                {profile.followerCount === null ? null : (
                  <div>
                    <dt>팔로워</dt>
                    <dd>{compact(profile.followerCount)}</dd>
                  </div>
                )}
                <div>
                  <dt>작품</dt>
                  <dd>{series.length}</dd>
                </div>
                <div>
                  <dt>회차</dt>
                  <dd>{compact(episodeTotal)}</dd>
                </div>
                <div>
                  <dt>총 조회</dt>
                  <dd>{compact(profile.totalViews)}</dd>
                </div>
              </dl>
              {links.length === 0 ? null : (
                <ul className="cp-links" aria-label="외부 링크">
                  {links.map((link) => (
                    <li key={link.id}>
                      <a
                        href={linkHref(link)}
                        target={link.kind === 'EMAIL' ? undefined : '_blank'}
                        rel="noopener noreferrer nofollow"
                      >
                        <LinkIcon kind={link.kind} />
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="cp-section" id="works" aria-labelledby="cp-works">
            <header className="cp-section-head">
              <h2 id="cp-works">
                작품 <span>{series.length}</span>
              </h2>
            </header>
            {series.length === 0 ? (
              <div className="cp-empty">
                <strong>아직 공개한 작품이 없습니다</strong>
                <p>첫 작품이 공개되면 이곳에 가장 먼저 올라옵니다.</p>
              </div>
            ) : (
              <>
                {longForm.length === 0 ? null : (
                  <ul className="cp-grid">
                    {longForm.map((item, index) => (
                      <WorkCard
                        key={item.id}
                        series={item}
                        index={index}
                        featured={item === featured}
                      />
                    ))}
                  </ul>
                )}
                {shortForm.length === 0 ? null : (
                  <>
                    <h3 className="cp-subhead">숏폼</h3>
                    <ul className="cp-grid is-vertical">
                      {shortForm.map((item, index) => (
                        <WorkCard key={item.id} series={item} index={index} />
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </section>

          {relatedCreators.length === 0 ? null : (
            <section className="cp-section" aria-labelledby="cp-related">
              <header className="cp-section-head">
                <h2 id="cp-related">비슷한 작가</h2>
                <Link href="/creators" className="cp-more">
                  모든 작가 <ArrowRight aria-hidden="true" />
                </Link>
              </header>
              <ul className="cp-related">
                {relatedCreators.map((creator) => (
                  <RelatedCreatorCard key={creator.handle} creator={creator} />
                ))}
              </ul>
            </section>
          )}
        </main>

        <DiscoveryFooter handle={session?.user.handle ?? 'ilog'} />
      </div>
    )
  } catch (error: unknown) {
    if (error instanceof AppError && error.code === 'E_USER_NOT_FOUND') {
      notFound()
    }
    throw error
  }
}
