import { Clapperboard, Film, Plus, UploadCloud } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { requireCapability } from '@/src/auth/server-session'
import { StudioSeriesTable } from '@/src/components/studio/StudioSeriesTable'
import { listStudioSeries } from '@/src/services/series/get-studio-series'

export const metadata: Metadata = { title: '콘텐츠 관리 · ILOG' }

export default async function StudioContentPage(): Promise<ReactNode> {
  const session = await requireCapability('series.create', '/studio/content')
  const series = await listStudioSeries(session)
  const activeCount = series.filter(
    (item) => !item.isCompleted && item.episodeCount > 0,
  ).length
  const readyCount = series.filter(
    (item) => !item.isCompleted && item.episodeCount === 0,
  ).length
  const completedCount = series.filter((item) => item.isCompleted).length

  return (
    <main className="studio-task-page studio-content-page">
      <header className="studio-page-header">
        <div>
          <span>CONTENT LIBRARY</span>
          <h1>콘텐츠 관리</h1>
          <p>
            시리즈·영화·숏폼·광고를 한곳에서 찾고 공개 상태와 실적을 관리합니다.
          </p>
        </div>
        <div className="studio-primary-actions">
          <Link href="/studio/upload" className="studio-button secondary">
            <UploadCloud aria-hidden="true" /> 영상 업로드
          </Link>
          <Link href="/studio/series/new" className="studio-button primary">
            <Plus aria-hidden="true" /> 새 작품
          </Link>
        </div>
      </header>

      <section className="studio-library-summary" aria-label="콘텐츠 현황">
        <article>
          <Clapperboard aria-hidden="true" />
          <span>전체 작품</span>
          <strong>{series.length}</strong>
        </article>
        <article>
          <Film aria-hidden="true" />
          <span>운영 중</span>
          <strong>{activeCount}</strong>
        </article>
        <article>
          <span className="studio-summary-dot" aria-hidden="true" />
          <span>준비 중</span>
          <strong>{readyCount}</strong>
        </article>
        <article>
          <span className="studio-summary-dot completed" aria-hidden="true" />
          <span>완결</span>
          <strong>{completedCount}</strong>
        </article>
      </section>

      <section className="studio-content-section">
        <div className="studio-section-title-row">
          <div>
            <span>ALL WORKS</span>
            <h2>작품 라이브러리</h2>
            <p>
              작품을 선택하면 영상·회차·공개·예약·분석을 관리할 수 있습니다.
            </p>
          </div>
        </div>
        <StudioSeriesTable series={series} advanced />
      </section>
    </main>
  )
}
