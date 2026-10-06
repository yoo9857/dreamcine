import {
  type AgeRating,
  type EpisodeResponse,
  type PlaybackResponse,
  type SeriesResponse,
} from '@aidream/core'
import { findSeriesById, listEpisodesBySeries } from '@aidream/db'
import type { Metadata } from 'next'
import { Avatar } from '@aidream/ui'
import { ArrowRight, BadgeCheck, Play } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { DiscoveryFooter } from '@/src/components/discovery/DiscoveryFooter'
import { DiscoveryTopbar } from '@/src/components/discovery/DiscoveryTopbar'
import { WatchPlayer } from '@/src/components/player/HlsPlayer'
import { ProfileShareButton } from '@/src/components/profile/ProfileShareButton'
import { JsonLd } from '@/src/components/seo/JsonLd'
import { workTypeLabel } from '@/src/components/studio/work-types'
import {
  buildSeriesJsonLd,
  buildSeriesMetadata,
} from '@/src/lib/seo/series-metadata'
import '@/src/styles/player.css'
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

/** 미리보기 작품(`preview-1`)의 회차. DB 에 없는 데모라 재생 링크는 걸지 않는다. */
const PREVIEW_EPISODE_TITLES = [
  '사라지는 장면',
  '기억 보관소',
  '세 번째 선택',
  '되감기',
  '빈 프레임',
  '서로의 내일',
  '마지막 상영',
  '내일의 기억',
] as const

function previewEpisodes(series: SeriesResponse): EpisodeResponse[] {
  if (series.id !== 'preview-1') return []
  return PREVIEW_EPISODE_TITLES.map((title, index) => ({
    id: `preview-ep-${String(index + 1)}`,
    seriesId: series.id,
    seasonId: null,
    assetId: null,
    number: index + 1,
    title,
    description:
      index === 0
        ? '기억을 영상으로 보관하는 회사에 첫 출근한 날, 지워져야 할 장면 하나가 사라지지 않는다.'
        : null,
    status: 'PUBLISHED',
    ageRating: series.ageRating,
    aiDisclosure: null,
    publishAt: null,
    publishedAt: new Date(Date.UTC(2026, 7, 26 + index * 7)).toISOString(),
    viewCount: String(Math.round(48_000 / (index + 1))),
    likeCount: 0,
    commentCount: 0,
    createdAt: series.createdAt,
    updatedAt: series.updatedAt,
  }))
}

function posterFor(series: SeriesResponse, index = 0): string {
  return (
    series.posterUrl ??
    PREVIEW_POSTERS.at(index % PREVIEW_POSTERS.length) ??
    '/brand/posters/tomorrow.png'
  )
}

const AGE_LABELS: Readonly<Record<AgeRating, string>> = {
  ALL: '전체 관람가',
  A12: '12세 이상',
  A15: '15세 이상',
  A19: '청소년 관람불가',
}

const COMPACT = new Intl.NumberFormat('ko-KR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function compact(value: string | number): string {
  const number = Number(value)
  return Number.isFinite(number) ? COMPACT.format(number) : '0'
}

const DATE = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'Asia/Seoul',
})

function EpisodeRow({
  episode,
  fallbackImage,
  playable,
}: {
  readonly episode: EpisodeResponse
  readonly fallbackImage: string
  readonly playable: boolean
}): ReactNode {
  const body = (
    <>
      <span className="sp-ep-thumb">
        <img
          src={episode.thumbUrl ?? fallbackImage}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span className="sp-ep-number">{episode.number}화</span>
        {playable ? (
          <span className="sp-ep-play" aria-hidden="true">
            <Play fill="currentColor" />
          </span>
        ) : null}
      </span>
      <span className="sp-ep-copy">
        <strong>{episode.title}</strong>
        {episode.description === null ? null : (
          <span className="sp-ep-desc">{episode.description}</span>
        )}
        <small>
          {episode.publishedAt === null
            ? '공개 예정'
            : DATE.format(new Date(episode.publishedAt))}
          {' · '}조회 {compact(episode.viewCount)}
        </small>
      </span>
    </>
  )
  return (
    <li>
      {playable ? (
        <Link
          href={`/watch/${episode.id}`}
          className="sp-ep"
          aria-label={`${String(episode.number)}화 ${episode.title} 보기`}
        >
          {body}
        </Link>
      ) : (
        <div className="sp-ep">{body}</div>
      )}
    </li>
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
    <li className="sp-card">
      <Link href={`/series/${series.id}`}>
        <span className="sp-card-media">
          <img src={posterFor(series, index)} alt="" loading="lazy" />
          <span className="sp-card-badge">
            {workTypeLabel(series.workType)}
          </span>
        </span>
        <span className="sp-card-copy">
          <strong>{series.title}</strong>
          <small>
            {series.episodeCount}화 · 조회 {compact(series.totalViews)}
          </small>
        </span>
      </Link>
    </li>
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
  const [{ seriesId }, session] = await Promise.all([
    params,
    getServerSession(),
  ])
  const isPortfolioPreview = /^preview-[1-5]$/u.test(seriesId)

  let detail: SeriesDetailResponse
  let creator: SeriesCreator
  let otherSeries: readonly SeriesResponse[]
  let playback: PlaybackResponse | null = null

  if (isPortfolioPreview) {
    const selected = PREVIEW_WORKS.find((series) => series.id === seriesId)
    if (selected === undefined) notFound()
    detail = { series: selected, episodes: previewEpisodes(selected) }
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

    const first = detail.episodes[0]
    if (first !== undefined) {
      const requestHeaders = await headers()
      playback = await getPlayback({
        episodeId: first.id,
        session,
        cookieHeader: requestHeaders.get('cookie'),
        now: new Date(),
      }).catch(() => null)
    }
  }

  const { series } = detail
  const releaseYear = new Date(series.createdAt).getFullYear()
  const firstEpisode = detail.episodes[0]
  const poster = posterFor(series)
  // 미리보기 회차는 DB 에 없어 재생 화면으로 보낼 수 없다.
  const playable = !isPortfolioPreview
  // 화면의 숫자는 보이는 공개 회차에서 센다. 시리즈 집계는 비공개 회차까지 세어
  // "12화" 아래에 회차가 8개만 보이는 어긋남을 만든다. (미리보기는 데모 숫자)
  const episodeTotal = isPortfolioPreview
    ? series.episodeCount
    : detail.episodes.length
  // 숏폼은 9:16 으로 올라온다(SeriesPosterUploader). 16:9 틀에 넣으면 가운데 띠만 남는다.
  const vertical = series.workType === 'SHORT_FORM'

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
    <div className="series-page" id="discovery-top">
      {jsonLdDocuments.map((document, index) => (
        <JsonLd key={`jsonld-${String(index)}`} document={document} />
      ))}
      <DiscoveryTopbar user={session?.user ?? null} />

      <main className="sp">
        <section className="sp-hero" aria-labelledby="sp-title">
          <div className="sp-hero-glow" aria-hidden="true">
            <img src={poster} alt="" />
          </div>

          <div className="sp-hero-copy">
            <p className="sp-kicker">
              <span>{workTypeLabel(series.workType)}</span>
              <span>{releaseYear}</span>
              <span>{AGE_LABELS[series.ageRating]}</span>
              <span className={series.isCompleted ? 'is-done' : 'is-live'}>
                {series.isCompleted ? '완결' : '연재 중'}
              </span>
            </p>
            <h1 id="sp-title">{series.title}</h1>
            <p className="sp-synopsis">
              {series.synopsis ?? '작품 소개가 아직 없습니다.'}
            </p>
            <p className="sp-stats">
              {episodeTotal}화 · 조회 {compact(series.totalViews)}
            </p>

            <div className="sp-actions">
              {firstEpisode !== undefined && playable ? (
                <Link href={`/watch/${firstEpisode.id}`} className="sp-play">
                  <Play aria-hidden="true" fill="currentColor" />
                  1화 보기
                </Link>
              ) : (
                <a href="#episodes" className="sp-play">
                  <Play aria-hidden="true" fill="currentColor" />
                  회차 보기
                </a>
              )}
              <ProfileShareButton title={`${series.title} · ilog`} />
            </div>

            <Link href={`/u/${creator.handle}`} className="sp-creator">
              <Avatar
                name={creator.displayName}
                src={creator.avatarUrl}
                size="md"
                className="sp-creator-avatar"
              />
              <span>
                <small>작가</small>
                <strong>
                  {creator.displayName}
                  {creator.isVerified ? (
                    <BadgeCheck role="img" aria-label="인증 채널" />
                  ) : null}
                </strong>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div
            className={vertical ? 'sp-media is-vertical' : 'sp-media'}
            id="watch"
          >
            {playback === null ? (
              <div className="sp-media-poster">
                <img src={poster} alt={`${series.title} 대표 이미지`} />
                {firstEpisode !== undefined && playable ? (
                  <Link
                    href={`/watch/${firstEpisode.id}`}
                    className="sp-media-play"
                    aria-label="1화 재생"
                  >
                    <Play aria-hidden="true" fill="currentColor" />
                  </Link>
                ) : null}
              </div>
            ) : (
              <WatchPlayer
                episodeId={playback.episodeId}
                authenticated={session !== null}
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

        <section className="sp-section" id="episodes" aria-labelledby="sp-eps">
          <header className="sp-section-head">
            <h2 id="sp-eps">
              회차 <span>{detail.episodes.length}</span>
            </h2>
          </header>
          {detail.episodes.length === 0 ? (
            <div className="sp-empty">
              <strong>아직 공개된 회차가 없습니다</strong>
              <p>첫 회차가 공개되면 이곳에서 바로 볼 수 있습니다.</p>
            </div>
          ) : (
            <ol
              className={vertical ? 'sp-episodes is-vertical' : 'sp-episodes'}
            >
              {detail.episodes.map((episode) => (
                <EpisodeRow
                  key={episode.id}
                  episode={episode}
                  fallbackImage={poster}
                  playable={playable}
                />
              ))}
            </ol>
          )}
        </section>

        {otherSeries.length === 0 ? null : (
          <section className="sp-section" aria-labelledby="sp-more">
            <header className="sp-section-head">
              <h2 id="sp-more">{creator.displayName}의 다른 작품</h2>
              <Link href={`/u/${creator.handle}`} className="sp-more">
                작가 페이지 <ArrowRight aria-hidden="true" />
              </Link>
            </header>
            <ul className="sp-grid">
              {otherSeries.slice(0, 8).map((item, index) => (
                <OtherWorkCard key={item.id} series={item} index={index + 1} />
              ))}
            </ul>
          </section>
        )}
      </main>

      <DiscoveryFooter handle={session?.user.handle ?? 'ilog'} />
    </div>
  )
}
