import { type PlaybackResponse, type SeriesResponse } from '@aidream/core'
import { findSeriesById, listEpisodesBySeries } from '@aidream/db'
import type { Metadata } from 'next'
import { Avatar } from '@aidream/ui'
import { ArrowUpRight, Play } from 'lucide-react'
import { cookies, headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { WatchPlayer } from '@/src/components/player/HlsPlayer'
import { JsonLd } from '@/src/components/seo/JsonLd'
import { ShowcaseThemeToggle } from '@/src/components/showcase/ShowcaseThemeToggle'
import {
  buildSeriesJsonLd,
  buildSeriesMetadata,
} from '@/src/lib/seo/series-metadata'
import { THEME_COOKIE, parseTheme } from '@/src/lib/theme'
import '@/src/styles/series-showcase.css'
import { getPlayback } from '@/src/services/episode/get-playback'
import {
  getSeries,
  type SeriesDetailResponse,
} from '@/src/services/series/get-series'
import {
  getSeriesCreator,
  type SeriesCreator,
} from '@/src/services/series/get-series-creator'
import { getProfileSeries } from '@/src/services/user/get-profile-series'

export const revalidate = 60

const PREVIEW_POSTERS = [
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

const PREVIEW_WORKS: readonly SeriesResponse[] = PREVIEW_POSTERS.map(
  (posterUrl, index) => ({
    id: `preview-${String(index + 1)}`,
    ownerId: 'preview-owner',
    slug: `preview-work-${String(index + 1)}`,
    title: PREVIEW_TITLES.at(index) ?? '이름 없는 작품',
    synopsis:
      index === 0
        ? '기억을 영상으로 보관하는 가까운 미래. 사라져 가는 장면을 붙잡으려는 세 사람의 선택이 서로의 내일을 바꾸기 시작합니다.'
        : '현실과 상상의 경계에서 발견한 감정을 시네마틱 이미지로 기록한 작품입니다.',
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

const PREVIEW_CREATOR: SeriesCreator = {
  handle: 'hanbin',
  displayName: '한빈',
  avatarUrl: null,
  tier: 'GOLD',
  isVerified: true,
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

function posterFor(series: SeriesResponse, index = 0): string {
  return (
    series.posterUrl ??
    PREVIEW_POSTERS.at(index % PREVIEW_POSTERS.length) ??
    '/brand/posters/tomorrow.png'
  )
}

function OtherWorkCard({
  series,
  index,
}: {
  readonly series: SeriesResponse
  readonly index: number
}): ReactNode {
  return (
    <article className="series-other-card">
      <Link href={`/series/${series.id}`}>
        <div className="series-other-image">
          <img src={posterFor(series, index)} alt={`${series.title} 포스터`} />
          <span className="series-other-label">
            <span>작품 보기</span>
            <span className="series-other-label-arrow">
              <ArrowUpRight aria-hidden="true" />
            </span>
            <Corner className="series-other-label-corner series-other-label-corner-bottom" />
            <Corner className="series-other-label-corner series-other-label-corner-right" />
          </span>
        </div>
        <div className="series-other-copy">
          <strong>{series.title}</strong>
          <small>{series.episodeCount} EPISODES</small>
        </div>
      </Link>
    </article>
  )
}

/**
 * 시리즈 상세의 공유·색인 메타데이터.
 *
 * 포트폴리오 프리뷰(`preview-1`..`preview-5`) 는 DB 에 없는 데모 경로다.
 * 색인 대상이 아니므로 `noindex` 로 고정한다.
 */
export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ seriesId: string }>
}): Promise<Metadata> {
  const { seriesId } = await params
  if (/^preview-[1-5]$/u.test(seriesId)) {
    return { title: '작품', robots: { index: false, follow: false } }
  }

  const series = await findSeriesById(seriesId).catch(() => null)
  if (series === null) {
    return { title: '작품', robots: { index: false, follow: false } }
  }
  const [creator, episodes] = await Promise.all([
    getSeriesCreator(series.ownerId).catch(() => null),
    listEpisodesBySeries({
      seriesId,
      status: ['PUBLISHED'],
      limit: 1,
    }).catch(() => null),
  ])
  return buildSeriesMetadata(series, {
    publishedEpisodeCount: episodes?.items.length ?? 0,
    creatorDisplayName: creator?.displayName ?? 'ilog',
  })
}

export default async function SeriesPage({
  params,
}: {
  readonly params: Promise<{ seriesId: string }>
}): Promise<ReactNode> {
  const { seriesId } = await params
  const cookieStore = await cookies()
  const currentTheme =
    parseTheme(cookieStore.get(THEME_COOKIE)?.value) ?? 'dark'
  const isPortfolioPreview = /^preview-[1-5]$/u.test(seriesId)

  let detail: SeriesDetailResponse
  let creator: SeriesCreator
  let otherSeries: readonly SeriesResponse[]
  let playback: PlaybackResponse | null = null
  let authenticated = false

  if (isPortfolioPreview) {
    const selected = PREVIEW_WORKS.find((series) => series.id === seriesId)
    if (selected === undefined) notFound()
    detail = { series: selected, episodes: [] }
    creator = PREVIEW_CREATOR
    otherSeries = PREVIEW_WORKS.filter((series) => series.id !== seriesId)
  } else {
    const result = await getSeries(seriesId).catch(() => null)
    if (result === null) notFound()
    detail = result
    creator = await getSeriesCreator(detail.series.ownerId)
    otherSeries = (await getProfileSeries(creator.handle)).filter(
      (series) => series.id !== detail.series.id,
    )

    const firstEpisode = detail.episodes[0]
    if (firstEpisode !== undefined) {
      const [session, requestHeaders] = await Promise.all([
        getServerSession(),
        headers(),
      ])
      authenticated = session !== null
      playback = await getPlayback({
        episodeId: firstEpisode.id,
        session,
        cookieHeader: requestHeaders.get('cookie'),
        now: new Date(),
      }).catch(() => null)
    }
  }

  const releaseYear = new Date(detail.series.createdAt).getFullYear()
  const firstEpisode = detail.episodes[0]

  /*
    구조화 데이터는 API 응답(`SeriesResponse`)이 아니라 도메인 엔티티에서
    만든다. `metaTitle` · `keywords` · `visibility` 같은 색인용 필드는 공개
    API 계약에 없기 때문이다. 실패해도 페이지는 그대로 나간다.
  */
  const seriesEntity = isPortfolioPreview
    ? null
    : await findSeriesById(seriesId).catch(() => null)
  const jsonLdDocuments =
    seriesEntity === null
      ? []
      : buildSeriesJsonLd(seriesEntity, {
          creatorHandle: creator.handle,
          creatorDisplayName: creator.displayName,
          episodes: detail.episodes.map((episode) => ({
            id: episode.id,
            number: episode.number,
            title: episode.title,
          })),
        })

  return (
    <div className="series-showcase">
      {jsonLdDocuments.map((document, index) => (
        <JsonLd key={`jsonld-${String(index)}`} document={document} />
      ))}
      <header className="series-floating-header">
        <nav aria-label="작품 메뉴">
          <Link href="/" className="series-wordmark" aria-label="ilog 홈">
            <Play aria-hidden="true" fill="currentColor" />
            <span>ILOG</span>
          </Link>
          <div className="series-header-links">
            <Link href={`/u/${creator.handle}`}>작가</Link>
            <a href="#watch">영상</a>
            <a href="#other-works">다른 작품</a>
          </div>
          <ShowcaseThemeToggle
            current={currentTheme}
            className="series-theme-pill"
          />
        </nav>
        <Corner className="series-corner series-corner-bottom" />
        <Corner className="series-corner series-corner-right" />
      </header>

      <a className="series-mobile-menu" href="#watch">
        <span>Menu</span>
        <Corner className="series-mobile-corner-bottom" />
        <Corner className="series-mobile-corner-left" />
      </a>

      <div className="series-layout">
        <aside className="series-cover-wrap">
          <div className="series-cover">
            <img
              src={posterFor(detail.series)}
              alt={`${detail.series.title} 대표 이미지`}
            />
            <div className="series-cover-label">
              <span>{detail.series.title}</span>
              <Corner className="series-cover-label-bottom" />
              <Corner className="series-cover-label-right" />
            </div>
          </div>
        </aside>

        <main className="series-content">
          <section className="series-intro">
            <div className="series-intro-heading">
              <p className="series-intro-kicker">
                FILM · {String(releaseYear)}
              </p>
              <h1>{detail.series.title}</h1>
            </div>
            <p className="series-intro-description">
              {detail.series.synopsis ?? '작품 소개가 아직 없습니다.'}
            </p>
          </section>

          <section className="series-video-section" id="watch">
            <div className="series-video-frame">
              {playback === null ? (
                <div className="series-video-unavailable">
                  <Play aria-hidden="true" />
                  <p>현재 재생 가능한 영상이 없습니다.</p>
                  {firstEpisode === undefined ? null : (
                    <Link href={`/watch/${firstEpisode.id}`}>
                      에피소드 보기
                    </Link>
                  )}
                </div>
              ) : (
                <WatchPlayer
                  episodeId={playback.episodeId}
                  authenticated={authenticated}
                  masterUrl={playback.masterUrl}
                  {...(playback.posterUrl === undefined
                    ? {}
                    : { posterUrl: playback.posterUrl })}
                  {...(playback.spriteUrl === undefined
                    ? {}
                    : { spriteUrl: playback.spriteUrl })}
                  {...(playback.spriteVttUrl === undefined
                    ? {}
                    : { spriteVttUrl: playback.spriteVttUrl })}
                  startAtSec={playback.startAtSec}
                  durationSec={playback.durationSec}
                />
              )}
            </div>
          </section>

          <dl className="series-facts">
            <div>
              <dt>배경</dt>
              <dd>ILOG ORIGINAL · {detail.series.ageRating}</dd>
            </div>
            <div>
              <dt>출시년</dt>
              <dd>{releaseYear}</dd>
            </div>
            <div>
              <dt>작가</dt>
              <dd>
                <Link href={`/u/${creator.handle}`}>
                  {creator.displayName} · @{creator.handle}
                </Link>
              </dd>
            </div>
            <div>
              <dt>에피소드</dt>
              <dd>{detail.series.episodeCount}</dd>
            </div>
          </dl>

          <section className="series-creator-card">
            <Avatar
              name={creator.displayName}
              src={creator.avatarUrl}
              size="lg"
              className="series-creator-avatar"
            />
            <div>
              <span>CREATED BY</span>
              <h2>{creator.displayName}</h2>
              <p>@{creator.handle}</p>
            </div>
            <Link href={`/u/${creator.handle}`}>
              작가 프로필
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </section>
        </main>
      </div>

      <section className="series-other-works" id="other-works">
        <header>
          <div>
            <p>MORE FROM THE CREATOR</p>
            <h2>다른 작품들</h2>
          </div>
          <Link href={`/u/${creator.handle}`}>전체 보기</Link>
        </header>
        <div className="series-other-grid">
          {otherSeries.slice(0, 4).map((series, index) => (
            <OtherWorkCard key={series.id} series={series} index={index} />
          ))}
        </div>
      </section>
    </div>
  )
}
