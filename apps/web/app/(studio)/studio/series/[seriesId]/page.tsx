import { ArrowLeft, ChevronRight, Eye, Film } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { requireCapability } from '@/src/auth/server-session'
import { EpisodeCreateWorkspace } from '@/src/components/studio/EpisodeCreateWorkspace'
import { EditSeriesForm } from '@/src/components/studio/EditSeriesForm'
import { EpisodeTable } from '@/src/components/studio/EpisodeTable'
import { SeriesPerformancePanel } from '@/src/components/studio/SeriesPerformancePanel'
import { SeriesPosterUploader } from '@/src/components/studio/SeriesPosterUploader'
import { workTypeLabel } from '@/src/components/studio/work-types'
import { getStudioSeries } from '@/src/services/series/get-studio-series'
import {
  getAvailableStudioAssets,
  getStudioSeriesAnalytics,
} from '@/src/services/studio/get-studio-dashboard'

export default async function StudioSeriesPage({
  params,
}: {
  readonly params: Promise<{ seriesId: string }>
}): Promise<ReactNode> {
  const { seriesId } = await params
  const session = await requireCapability(
    'episode.create',
    `/studio/series/${seriesId}`,
  )
  const [detail, availableAssets, analytics] = await Promise.all([
    getStudioSeries(session, seriesId).catch(() => null),
    getAvailableStudioAssets(session),
    getStudioSeriesAnalytics(session, seriesId),
  ])
  if (detail === null || analytics === null) notFound()
  const seasonCount = new Set(
    analytics.episodes.map((episode) => episode.seasonNumber ?? 1),
  ).size
  const episodic = detail.series.workType === 'SERIES'

  return (
    <main className="studio-series-page">
      <Link href="/studio#content" className="studio-back-link">
        <ArrowLeft aria-hidden="true" /> 콘텐츠로 돌아가기
      </Link>
      <header className="studio-series-header">
        <SeriesPosterUploader
          seriesId={seriesId}
          workType={detail.series.workType}
          {...(detail.series.posterUrl === undefined
            ? {}
            : { posterUrl: detail.series.posterUrl })}
        />
        <div>
          <span>
            WORK · {workTypeLabel(detail.series.workType).toUpperCase()}
          </span>
          <h1>{detail.series.title}</h1>
          <p>
            {detail.series.synopsis ??
              '작품 소개를 추가하면 공개 페이지의 완성도가 높아집니다.'}
          </p>
          <div className="studio-series-meta">
            <span>
              <Film aria-hidden="true" /> {detail.series.episodeCount}개{' '}
              {episodic ? '회차' : '영상'}
            </span>
            <span>
              <Eye aria-hidden="true" />{' '}
              {new Intl.NumberFormat('ko-KR').format(
                BigInt(detail.series.totalViews),
              )}
              회 조회
            </span>
          </div>
        </div>
      </header>

      <section
        className="studio-series-hierarchy"
        aria-label="작품과 회차 구성"
      >
        <article>
          <span>작품 · {workTypeLabel(detail.series.workType)}</span>
          <strong>{detail.series.title}</strong>
          <small>
            {episodic
              ? '모든 시즌과 회차를 묶는 최상위 작품'
              : '본편과 여러 버전을 묶는 최상위 작품'}
          </small>
        </article>
        <ChevronRight aria-hidden="true" />
        <article>
          <span>{episodic ? '시즌' : '영상 구성'}</span>
          <strong>{episodic ? `${String(seasonCount)}개` : '본편·버전'}</strong>
          <small>
            {episodic
              ? '긴 작품을 시즌 단위로 구분'
              : '본편과 컷다운·버전을 구분'}
          </small>
        </article>
        <ChevronRight aria-hidden="true" />
        <article>
          <span>{episodic ? '개별 회차' : '연결 영상'}</span>
          <strong>{detail.series.episodeCount}개</strong>
          <small>
            {episodic
              ? '1화·2화·3화를 각각 독립 관리'
              : '영상별 공개·수정·데이터를 독립 관리'}
          </small>
        </article>
      </section>

      <nav
        className="studio-series-jump-nav"
        aria-label="작품 및 회차 관리 메뉴"
      >
        <a href="#episodes">{episodic ? '회차 관리' : '영상 관리'}</a>
        <a href="#new-episode">{episodic ? '새 회차' : '새 영상'}</a>
        <a href="#performance">콘텐츠 데이터</a>
        <a href="#settings">작품 설정</a>
      </nav>

      <section className="studio-series-section" id="episodes">
        <div className="studio-section-title-row">
          <div>
            <span>{episodic ? 'EPISODE LIBRARY' : 'VIDEO LIBRARY'}</span>
            <h2>
              {detail.series.title}의 {episodic ? '회차' : '영상'} 관리
            </h2>
            <p>
              {episodic
                ? '작품 안의 1화·2화·3화를 각각 수정하고 공개·예약·분석합니다.'
                : '본편·숏폼·CF 버전을 각각 수정하고 공개·예약·분석합니다.'}
            </p>
          </div>
          <EpisodeCreateWorkspace
            seriesId={seriesId}
            availableAssets={availableAssets}
            workType={detail.series.workType}
          />
        </div>
        <EpisodeTable
          episodes={detail.episodes}
          availableAssets={availableAssets}
          structure={analytics.episodes}
          workType={detail.series.workType}
        />
      </section>

      <section className="studio-series-section" id="performance">
        <div className="studio-section-title-row">
          <div>
            <span>WORK PERFORMANCE</span>
            <h2>작품 콘텐츠 데이터</h2>
            <p>
              전체 성과를 비교하고 개선할 {episodic ? '회차' : '영상'}를 빠르게
              찾습니다.
            </p>
          </div>
        </div>
        <SeriesPerformancePanel
          analytics={analytics}
          workType={detail.series.workType}
        />
      </section>

      <section className="studio-series-section" id="settings">
        <div className="studio-section-title-row">
          <div>
            <span>SERIES SETTINGS</span>
            <h2>작품 설정</h2>
            <p>공개 페이지에 표시할 정보와 커뮤니티 설정을 관리합니다.</p>
          </div>
        </div>
        <EditSeriesForm series={detail.series} />
      </section>
    </main>
  )
}
