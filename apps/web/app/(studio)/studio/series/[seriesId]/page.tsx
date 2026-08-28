import { ArrowLeft, Eye, Film, Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { requireCapability } from '@/src/auth/server-session'
import { CreateEpisodeForm } from '@/src/components/studio/CreateEpisodeForm'
import { EditSeriesForm } from '@/src/components/studio/EditSeriesForm'
import { EpisodeTable } from '@/src/components/studio/EpisodeTable'
import { getStudioSeries } from '@/src/services/series/get-studio-series'
import { getAvailableStudioAssets } from '@/src/services/studio/get-studio-dashboard'

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
  const [detail, availableAssets] = await Promise.all([
    getStudioSeries(session, seriesId).catch(() => null),
    getAvailableStudioAssets(session),
  ])
  if (detail === null) notFound()

  return (
    <main className="studio-series-page">
      <Link href="/studio#content" className="studio-back-link">
        <ArrowLeft aria-hidden="true" /> 콘텐츠로 돌아가기
      </Link>
      <header className="studio-series-header">
        <div className="studio-series-cover">
          {detail.series.posterUrl === undefined ? (
            <Film aria-hidden="true" />
          ) : (
            <img src={detail.series.posterUrl} alt="" />
          )}
        </div>
        <div>
          <span>SERIES WORKSPACE</span>
          <h1>{detail.series.title}</h1>
          <p>
            {detail.series.synopsis ??
              '작품 소개를 추가하면 공개 페이지의 완성도가 높아집니다.'}
          </p>
          <div className="studio-series-meta">
            <span>
              <Film aria-hidden="true" /> {detail.series.episodeCount}개
              에피소드
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

      <section className="studio-series-section">
        <div className="studio-section-title-row">
          <div>
            <span>EPISODE LIBRARY</span>
            <h2>에피소드 관리</h2>
            <p>공개·예약·숨김 상태와 콘텐츠 실적을 관리합니다.</p>
          </div>
        </div>
        <EpisodeTable
          episodes={detail.episodes}
          availableAssets={availableAssets}
        />
      </section>

      <section className="studio-series-section studio-create-episode">
        <div className="studio-section-title-row">
          <div>
            <span>NEW EPISODE</span>
            <h2>
              <Plus aria-hidden="true" /> 에피소드 추가
            </h2>
            <p>업로드와 변환이 끝난 영상을 작품에 연결합니다.</p>
          </div>
        </div>
        <CreateEpisodeForm
          seriesId={seriesId}
          availableAssets={availableAssets}
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
