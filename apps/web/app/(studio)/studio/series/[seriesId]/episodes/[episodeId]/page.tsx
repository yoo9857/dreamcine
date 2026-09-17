import {
  ArrowLeft,
  BarChart3,
  Clock3,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { requireCapability } from '@/src/auth/server-session'
import { getStudioSeriesAnalytics } from '@/src/services/studio/get-studio-dashboard'

function compact(value: string | number): string {
  return new Intl.NumberFormat('ko-KR', { notation: 'compact' }).format(
    typeof value === 'string' ? BigInt(value) : value,
  )
}

function ratio(numerator: number, denominator: number | bigint): string {
  const divisor =
    typeof denominator === 'bigint' ? Number(denominator) : denominator
  if (divisor <= 0) return '—'
  return `${String(Math.min(999, Math.round((numerator / divisor) * 100)))}%`
}

export default async function StudioEpisodeAnalyticsPage({
  params,
}: {
  readonly params: Promise<{ seriesId: string; episodeId: string }>
}): Promise<ReactNode> {
  const { seriesId, episodeId } = await params
  const session = await requireCapability(
    'series.update',
    `/studio/series/${seriesId}/episodes/${episodeId}`,
  )
  const analytics = await getStudioSeriesAnalytics(session, seriesId)
  const episode = analytics?.episodes.find((item) => item.id === episodeId)
  if (analytics === null || episode === undefined) notFound()

  const views = BigInt(episode.viewCount)
  const watchSeconds = views * BigInt(episode.avgWatchSec)
  const interactions =
    episode.likeCount + episode.commentCount + episode.shareCount

  return (
    <main className="studio-content-analytics-page">
      <Link
        href={`/studio/series/${seriesId}#performance`}
        className="studio-back-link"
      >
        <ArrowLeft aria-hidden="true" /> 시리즈 데이터로 돌아가기
      </Link>

      <header className="studio-content-analytics-header">
        <span className="studio-content-analytics-thumb">
          {episode.thumbUrl === null ? (
            <BarChart3 aria-hidden="true" />
          ) : (
            <img src={episode.thumbUrl} alt="" />
          )}
        </span>
        <div>
          <span>CONTENT ANALYTICS</span>
          <h1>{episode.title}</h1>
          <p>
            {analytics.series.title} ·{' '}
            {episode.seasonNumber === null
              ? ''
              : `시즌 ${String(episode.seasonNumber)} · `}
            {episode.number}화 · {episode.status}
          </p>
        </div>
      </header>

      <section className="studio-content-kpis" aria-label="콘텐츠 성과 요약">
        <article>
          <Eye aria-hidden="true" />
          <span>조회수</span>
          <strong>{compact(episode.viewCount)}</strong>
          <small>노출 {compact(episode.impressionCount)}</small>
        </article>
        <article>
          <Clock3 aria-hidden="true" />
          <span>추정 시청 시간</span>
          <strong>
            {(Number(watchSeconds) / 3600).toLocaleString('ko-KR', {
              maximumFractionDigits: 1,
            })}
            시간
          </strong>
          <small>평균 {episode.avgWatchSec}초</small>
        </article>
        <article>
          <Users aria-hidden="true" />
          <span>기록된 시청자</span>
          <strong>{compact(episode.uniqueViewers)}</strong>
          <small>완주 {compact(episode.completedViewers)}명</small>
        </article>
        <article>
          <BarChart3 aria-hidden="true" />
          <span>참여율</span>
          <strong>{ratio(interactions, views)}</strong>
          <small>반응 {compact(interactions)}회</small>
        </article>
      </section>

      <div className="studio-content-breakdown">
        <section>
          <div className="studio-section-heading">
            <div>
              <span>VIEW QUALITY</span>
              <h2>시청 품질</h2>
            </div>
            <Clock3 aria-hidden="true" />
          </div>
          <dl>
            <div>
              <dt>노출 대비 조회</dt>
              <dd>{ratio(Number(views), BigInt(episode.impressionCount))}</dd>
            </div>
            <div>
              <dt>평균 시청 시간</dt>
              <dd>{episode.avgWatchSec}초</dd>
            </div>
            <div>
              <dt>평균 시청률</dt>
              <dd>
                {episode.durationSec === null
                  ? '—'
                  : ratio(episode.avgWatchSec, episode.durationSec)}
              </dd>
            </div>
            <div>
              <dt>기록 사용자 완주율</dt>
              <dd>{ratio(episode.completedViewers, episode.uniqueViewers)}</dd>
            </div>
          </dl>
        </section>

        <section>
          <div className="studio-section-heading">
            <div>
              <span>ENGAGEMENT</span>
              <h2>시청자 반응</h2>
            </div>
            <Heart aria-hidden="true" />
          </div>
          <dl>
            <div>
              <dt>
                <Heart aria-hidden="true" /> 좋아요
              </dt>
              <dd>{compact(episode.likeCount)}</dd>
            </div>
            <div>
              <dt>
                <MessageCircle aria-hidden="true" /> 댓글
              </dt>
              <dd>{compact(episode.commentCount)}</dd>
            </div>
            <div>
              <dt>
                <Share2 aria-hidden="true" /> 공유
              </dt>
              <dd>{compact(episode.shareCount)}</dd>
            </div>
            <div>
              <dt>조회당 반응</dt>
              <dd>{ratio(interactions, views)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="studio-data-coverage">
        <strong>데이터 범위 안내</strong>
        <p>
          조회·노출·반응·평균 시청시간은 콘텐츠 누적 집계입니다. 기록된 시청자와
          완주율은 로그인 상태에서 이어보기 데이터가 저장된 사용자 기준입니다.
          일별 증감, 유입 경로, 기기, 시청 구간별 이탈은 재생 이벤트 원장이
          구축된 이후 정확하게 제공할 수 있습니다.
        </p>
      </section>
    </main>
  )
}
