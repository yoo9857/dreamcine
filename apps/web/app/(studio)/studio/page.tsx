import {
  ArrowRight,
  BarChart3,
  Clapperboard,
  Eye,
  Heart,
  MessageCircle,
  Plus,
  UploadCloud,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { requireCapability } from '@/src/auth/server-session'
import { StudioSeriesTable } from '@/src/components/studio/StudioSeriesTable'
import { listStudioSeries } from '@/src/services/series/get-studio-series'
import { getStudioDashboard } from '@/src/services/studio/get-studio-dashboard'

function formatCount(value: string | number): string {
  try {
    return new Intl.NumberFormat('ko-KR', { notation: 'compact' }).format(
      typeof value === 'string' ? BigInt(value) : value,
    )
  } catch {
    return String(value)
  }
}

export default async function StudioPage(): Promise<ReactNode> {
  const session = await requireCapability('series.create', '/studio')
  const [series, dashboard] = await Promise.all([
    listStudioSeries(session),
    getStudioDashboard(session),
  ])
  const published =
    dashboard.episodeStatus.find((item) => item.status === 'PUBLISHED')
      ?.count ?? 0
  const drafts =
    dashboard.episodeStatus.find((item) => item.status === 'DRAFT')?.count ?? 0

  return (
    <main className="studio-dashboard">
      <header className="studio-page-header">
        <div>
          <span>CREATOR STUDIO</span>
          <h1>콘텐츠 스튜디오</h1>
          <p>
            안녕하세요, {session.user.displayName}님. 작품 현황과 채널 성과를
            한곳에서 관리하세요.
          </p>
        </div>
        <div className="studio-primary-actions">
          <Link href="/studio/upload" className="studio-button secondary">
            <UploadCloud aria-hidden="true" /> 영상 업로드
          </Link>
          <Link href="/studio/series/new" className="studio-button primary">
            <Plus aria-hidden="true" /> 새 시리즈
          </Link>
        </div>
      </header>

      <section className="studio-kpi-grid" aria-label="채널 누적 실적">
        <article>
          <span>
            <Eye aria-hidden="true" /> 누적 조회수
          </span>
          <strong>{formatCount(dashboard.totals.views)}</strong>
          <small>전체 공개 콘텐츠 기준</small>
        </article>
        <article>
          <span>
            <Users aria-hidden="true" /> 팔로워
          </span>
          <strong>{formatCount(dashboard.totals.followers)}</strong>
          <small>현재 채널 구독 규모</small>
        </article>
        <article>
          <span>
            <Heart aria-hidden="true" /> 좋아요
          </span>
          <strong>{formatCount(dashboard.totals.likes)}</strong>
          <small>전체 에피소드 누적</small>
        </article>
        <article>
          <span>
            <MessageCircle aria-hidden="true" /> 댓글
          </span>
          <strong>{formatCount(dashboard.totals.comments)}</strong>
          <small>숨김 전 댓글 포함</small>
        </article>
      </section>

      <div className="studio-dashboard-grid">
        <section className="studio-overview-card" id="analytics">
          <div className="studio-section-heading">
            <div>
              <span>CHANNEL OVERVIEW</span>
              <h2>채널 현황</h2>
            </div>
            <BarChart3 aria-hidden="true" />
          </div>
          <div className="studio-overview-numbers">
            <div>
              <strong>{dashboard.totals.series}</strong>
              <span>시리즈</span>
            </div>
            <div>
              <strong>{dashboard.totals.episodes}</strong>
              <span>전체 에피소드</span>
            </div>
            <div>
              <strong>{published}</strong>
              <span>공개 중</span>
            </div>
            <div>
              <strong>{drafts}</strong>
              <span>초안</span>
            </div>
          </div>
          <div className="studio-status-list">
            {dashboard.episodeStatus.map((item) => (
              <span key={item.status} data-status={item.status}>
                {item.status === 'PUBLISHED'
                  ? '공개'
                  : item.status === 'DRAFT'
                    ? '초안'
                    : item.status === 'SCHEDULED'
                      ? '예약'
                      : item.status === 'HIDDEN'
                        ? '숨김'
                        : '삭제됨'}
                <strong>{item.count}</strong>
              </span>
            ))}
          </div>
          <p className="studio-data-note">
            기간별 추이는 재생 이벤트 원장이 연결된 뒤 제공됩니다. 현재는 검증된
            누적 데이터만 표시합니다.
          </p>
        </section>

        <section className="studio-recent-card">
          <div className="studio-section-heading">
            <div>
              <span>RECENT CONTENT</span>
              <h2>최근 업데이트</h2>
            </div>
            <Clapperboard aria-hidden="true" />
          </div>
          {dashboard.recentEpisodes.length === 0 ? (
            <div className="studio-recent-empty">
              <p>아직 에피소드가 없습니다.</p>
              <Link href="/studio/upload">첫 영상 업로드하기</Link>
            </div>
          ) : (
            <div className="studio-recent-list">
              {dashboard.recentEpisodes.map((episode) => (
                <Link
                  key={episode.id}
                  href={`/studio/series/${episode.seriesId}`}
                >
                  <span className="studio-recent-thumb">
                    {episode.thumbUrl === null ? (
                      <Clapperboard aria-hidden="true" />
                    ) : (
                      <img src={episode.thumbUrl} alt="" />
                    )}
                  </span>
                  <span>
                    <strong>{episode.title}</strong>
                    <small>
                      {episode.seriesTitle} · {episode.number}화
                    </small>
                  </span>
                  <span className="studio-recent-metric">
                    <Eye aria-hidden="true" /> {formatCount(episode.viewCount)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="studio-content-section" id="content">
        <div className="studio-section-title-row">
          <div>
            <span>CONTENT LIBRARY</span>
            <h2>시리즈 관리</h2>
            <p>공개 상태와 실적을 확인하고 에피소드를 관리합니다.</p>
          </div>
          <Link href="/studio/series/new">
            새 시리즈 <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        {series.length === 0 ? (
          <div className="studio-first-content">
            <Clapperboard aria-hidden="true" />
            <div>
              <strong>첫 시리즈를 만들어 보세요</strong>
              <p>시리즈를 만든 다음 업로드한 영상으로 에피소드를 구성합니다.</p>
            </div>
            <Link href="/studio/series/new" className="studio-button primary">
              시리즈 만들기
            </Link>
          </div>
        ) : (
          <StudioSeriesTable series={series} />
        )}
      </section>
    </main>
  )
}
