'use client'

import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  Film,
  Globe2,
  Info,
  MonitorSmartphone,
  MousePointerClick,
  Play,
  Radio,
  Smartphone,
  Tv,
  Users,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState, type CSSProperties } from 'react'

const AdminAudienceMap = dynamic(
  () => import('./AdminAudienceMap').then((module) => module.AdminAudienceMap),
  {
    ssr: false,
    loading: () => (
      <div className="admin-map-loading">세계 지도를 불러오는 중…</div>
    ),
  },
)

export interface AdminAnalyticsData {
  readonly coverage: 'live' | 'preview'
  readonly periodLabel: string
  readonly metrics: {
    readonly views: number
    readonly watchHours: number
    readonly averageViewDurationSec: number
    readonly uniqueViewers: number
    readonly viewTrend: number
    readonly watchTrend: number
    readonly durationTrend: number
    readonly viewerTrend: number
  }
  readonly timeline: readonly {
    readonly label: string
    readonly views: number
    readonly watchHours: number
  }[]
  readonly realtime: readonly number[]
  readonly retentionVideoTitle: string | null
  readonly retention: readonly {
    readonly percent: number
    readonly viewers: number
  }[]
  readonly countries: readonly {
    readonly code: string
    readonly name: string
    readonly views: number
    readonly watchHours: number
    readonly share: number
    readonly longitude: number
    readonly latitude: number
  }[]
  readonly trafficSources: readonly {
    readonly label: string
    readonly value: number
  }[]
  readonly devices: readonly {
    readonly label: string
    readonly value: number
  }[]
  readonly topVideos: readonly {
    readonly id: string
    readonly title: string
    readonly seriesTitle: string
    readonly views: number
    readonly watchHours: number
    readonly averageViewDurationSec: number
    readonly averageViewedPercent: number | null
    readonly completionRate: number | null
  }[]
}

type AnalyticsTab = 'overview' | 'engagement' | 'audience' | 'reach'

function compact(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function duration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes)}:${String(remainder).padStart(2, '0')}`
}

function points(
  values: readonly number[],
  width: number,
  height: number,
): string {
  const max = Math.max(...values, 1)
  return values
    .map((value, index) => {
      const x =
        values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - (value / max) * (height - 10) - 5
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function Trend({ value }: { readonly value: number }) {
  const positive = value >= 0
  const Icon = positive ? ArrowUpRight : ArrowDownRight
  return (
    <span className={positive ? 'is-positive' : 'is-negative'}>
      <Icon /> {positive ? '+' : ''}
      {value}%
    </span>
  )
}

function EmptyMetric({ children }: { readonly children: string }) {
  return (
    <div className="admin-analytics-empty">
      <Info />
      <strong>재생 이벤트 수집 필요</strong>
      <p>{children}</p>
    </div>
  )
}

export function AdminAnalyticsDashboard({
  data,
}: {
  readonly data: AdminAnalyticsData
}) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview')
  const timelineViews = data.timeline.map((item) => item.views)
  const timelineWatch = data.timeline.map((item) => item.watchHours)
  const retentionValues = data.retention.map((item) => item.viewers)
  const realtimeTotal = data.realtime.reduce((sum, value) => sum + value, 0)
  const realtimeMax = Math.max(...data.realtime, 1)
  const retentionLine = points(retentionValues, 760, 210)
  const viewLine = points(timelineViews, 920, 230)
  const watchLine = points(timelineWatch, 920, 230)
  const retentionArea =
    retentionLine === '' ? '' : `0,220 ${retentionLine} 760,220`

  const cards = [
    {
      label: '조회수',
      value: compact(data.metrics.views),
      detail: '유효 조회 기준',
      trend: data.metrics.viewTrend,
      icon: Eye,
      spark: timelineViews,
    },
    {
      label: '시청 시간',
      value: `${compact(data.metrics.watchHours)}시간`,
      detail: '누적 시청 시간',
      trend: data.metrics.watchTrend,
      icon: Clock3,
      spark: timelineWatch,
    },
    {
      label: '평균 시청 지속 시간',
      value: duration(data.metrics.averageViewDurationSec),
      detail: '재생당 평균',
      trend: data.metrics.durationTrend,
      icon: Play,
      spark: timelineViews.map(
        (value, index) => value / Math.max(timelineWatch[index] ?? 1, 1),
      ),
    },
    {
      label: '순 시청자',
      value: compact(data.metrics.uniqueViewers),
      detail: '중복 제거 시청자',
      trend: data.metrics.viewerTrend,
      icon: Users,
      spark: timelineViews.map((value) => value * 0.73),
    },
  ]

  return (
    <div className={`admin-dashboard admin-analytics-page is-tab-${activeTab}`}>
      <header className="admin-analytics-titlebar">
        <div>
          <p>
            <Radio /> CONTENT INTELLIGENCE
          </p>
          <h1>영상 분석</h1>
          <span>시청자가 콘텐츠를 발견하고 이탈하는 전 과정을 분석합니다.</span>
        </div>
        <div className="admin-analytics-title-actions">
          <button type="button">
            전체 콘텐츠 <ChevronDown />
          </button>
          <button type="button">
            {data.periodLabel} <ChevronDown />
          </button>
          <button type="button">
            <Download /> 내보내기
          </button>
        </div>
      </header>

      {data.coverage === 'preview' ? (
        <div className="admin-analytics-demo-notice">
          <Info /> 현재 화면은 분석 이벤트 계약을 검증하기 위한 미리보기
          데이터입니다.
        </div>
      ) : null}

      <nav className="admin-analytics-tabs" aria-label="분석 범주">
        {(
          [
            ['overview', '개요'],
            ['engagement', '참여도'],
            ['audience', '시청자'],
            ['reach', '도달 범위'],
          ] as const
        ).map(([value, label]) => (
          <button
            className={activeTab === value ? 'is-active' : undefined}
            key={value}
            type="button"
            onClick={() => {
              setActiveTab(value)
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="admin-analytics-kpis" aria-label="영상 핵심 지표">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <article key={card.label}>
              <header>
                <span>
                  <Icon /> {card.label}
                </span>
                <Info />
              </header>
              <div>
                <strong>{card.value}</strong>
                <Trend value={card.trend} />
              </div>
              <footer>
                <small>{card.detail}</small>
                <svg
                  viewBox="0 0 100 28"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <polyline points={points(card.spark, 100, 28)} />
                </svg>
              </footer>
            </article>
          )
        })}
      </section>

      <section className="admin-analytics-overview" id="overview">
        <article className="admin-analytics-card admin-performance-chart">
          <header className="admin-analytics-card-header">
            <div>
              <h2>콘텐츠 성과</h2>
              <p>조회수와 시청 시간의 일별 변화</p>
            </div>
            <div className="admin-chart-legend">
              <span className="is-view">조회수</span>
              <span className="is-watch">시청 시간</span>
            </div>
          </header>
          {data.timeline.length === 0 ? (
            <EmptyMetric>
              일별 조회 이벤트가 없어 누적값의 변화 추이를 만들 수 없습니다.
            </EmptyMetric>
          ) : (
            <div className="admin-dual-line-chart">
              <div className="admin-chart-grid" />
              <svg
                viewBox="0 0 920 230"
                preserveAspectRatio="none"
                role="img"
                aria-label="조회수와 시청 시간 추이"
              >
                <polyline className="is-watch" points={watchLine} />
                <polyline className="is-views" points={viewLine} />
              </svg>
              <footer>
                {data.timeline.map((item, index) => (
                  <span key={`${item.label}-${String(index)}`}>
                    {item.label}
                  </span>
                ))}
              </footer>
            </div>
          )}
        </article>

        <article className="admin-analytics-card admin-realtime-card">
          <header className="admin-analytics-card-header">
            <div>
              <h2>
                <i /> 실시간
              </h2>
              <p>최근 48시간</p>
            </div>
          </header>
          {data.realtime.length === 0 ? (
            <EmptyMetric>
              시간별 재생 세션을 수집하면 현재 시청 흐름을 표시합니다.
            </EmptyMetric>
          ) : (
            <>
              <div className="admin-realtime-total">
                <strong>{compact(realtimeTotal)}</strong>
                <span>조회</span>
              </div>
              <div
                className="admin-realtime-bars"
                aria-label="최근 48시간 조회수"
              >
                {data.realtime.map((value, index) => (
                  <i
                    key={index}
                    style={{
                      height: `${String(Math.max(5, (value / realtimeMax) * 100))}%`,
                    }}
                  />
                ))}
              </div>
              <footer>
                <span>48시간 전</span>
                <span>현재</span>
              </footer>
              <div className="admin-realtime-now">
                <Radio />
                <span>
                  <b>현재 38명</b>이 시청 중입니다.
                </span>
              </div>
            </>
          )}
        </article>
      </section>

      <section className="admin-analytics-retention-row" id="retention">
        <article className="admin-analytics-card admin-retention-card">
          <header className="admin-analytics-card-header">
            <div>
              <h2>시청자 유지율</h2>
              <p>{data.retentionVideoTitle ?? '분석할 영상이 없습니다.'}</p>
            </div>
            <button type="button">
              대표 영상 <ChevronDown />
            </button>
          </header>
          {data.retention.length === 0 ? (
            <EmptyMetric>
              15초 하트비트와 탐색 이벤트를 버킷화하면 실제 이탈·재시청 구간을
              계산할 수 있습니다.
            </EmptyMetric>
          ) : (
            <div className="admin-retention-chart">
              <aside>
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </aside>
              <div>
                <div className="admin-chart-grid" />
                <svg
                  viewBox="0 0 760 220"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label="영상 구간별 시청자 유지율"
                >
                  <polygon points={retentionArea} />
                  <polyline points={retentionLine} />
                </svg>
                <i className="is-intro">
                  <b>73%</b>
                  <span>30초 인트로</span>
                </i>
                <i className="is-peak">
                  <b>62%</b>
                  <span>재시청 구간</span>
                </i>
                <i className="is-dip">
                  <b>38%</b>
                  <span>주요 이탈</span>
                </i>
                <footer>
                  <span>0:00</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </footer>
              </div>
            </div>
          )}
        </article>

        <article className="admin-analytics-card admin-retention-summary">
          <header className="admin-analytics-card-header">
            <div>
              <h2>주요 순간</h2>
              <p>시청 흐름 자동 진단</p>
            </div>
          </header>
          <ul>
            <li className="is-good">
              <ArrowUpRight />
              <span>
                <b>인트로 유지</b>
                <small>30초 지점 73% · 평균 이상</small>
              </span>
              <em>좋음</em>
            </li>
            <li>
              <MousePointerClick />
              <span>
                <b>최고 재시청</b>
                <small>08:42 · 반전 장면</small>
              </span>
              <em>+12%</em>
            </li>
            <li className="is-bad">
              <ArrowDownRight />
              <span>
                <b>가장 큰 이탈</b>
                <small>14:18 · 전환 구간</small>
              </span>
              <em>-19%</em>
            </li>
          </ul>
        </article>
      </section>

      <section className="admin-analytics-geo-row" id="audience">
        <article className="admin-analytics-card admin-world-card">
          <header className="admin-analytics-card-header">
            <div>
              <h2>전 세계 시청자</h2>
              <p>접속 위치별 조회수와 시청 시간</p>
            </div>
            <button type="button">
              <Globe2 /> 국가별 <ChevronDown />
            </button>
          </header>
          {data.countries.length === 0 ? (
            <EmptyMetric>
              CDN 국가 코드와 재생 세션을 연결하면 실제 접속 지역을 집계합니다.
            </EmptyMetric>
          ) : (
            <div className="admin-world-layout">
              <div className="admin-world-map">
                {activeTab === 'audience' ? (
                  <AdminAudienceMap countries={data.countries} />
                ) : null}
              </div>
              <div className="admin-country-list">
                <header>
                  <span>국가</span>
                  <span>조회수</span>
                  <span>비중</span>
                </header>
                {data.countries.slice(0, 6).map((country) => (
                  <div key={country.code}>
                    <b>{country.code}</b>
                    <span>
                      <strong>{country.name}</strong>
                      <small>{compact(country.watchHours)}시간 시청</small>
                    </span>
                    <em>{compact(country.views)}</em>
                    <i>
                      <b style={{ width: `${String(country.share)}%` }} />
                    </i>
                    <small>{country.share}%</small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="admin-analytics-breakdowns" id="reach">
        <article className="admin-analytics-card admin-source-card">
          <header className="admin-analytics-card-header">
            <div>
              <h2>유입 경로</h2>
              <p>시청자가 영상을 발견한 위치</p>
            </div>
          </header>
          {data.trafficSources.length === 0 ? (
            <EmptyMetric>
              referrer와 내부 탐색 위치를 재생 시작 이벤트에 포함해야 합니다.
            </EmptyMetric>
          ) : (
            <div className="admin-source-layout">
              <div
                className="admin-donut"
                style={
                  {
                    '--segments': data.trafficSources
                      .map(
                        (item, index) =>
                          `var(--source-${String(index + 1)}) ${String(data.trafficSources.slice(0, index).reduce((sum, source) => sum + source.value, 0))}% ${String(data.trafficSources.slice(0, index + 1).reduce((sum, source) => sum + source.value, 0))}%`,
                      )
                      .join(', '),
                  } as CSSProperties
                }
              >
                <span>
                  <MousePointerClick />
                  <b>100%</b>
                  <small>전체 유입</small>
                </span>
              </div>
              <ul>
                {data.trafficSources.map((source, index) => (
                  <li key={source.label}>
                    <i className={`is-${String(index + 1)}`} />
                    <span>{source.label}</span>
                    <b>{source.value}%</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <article className="admin-analytics-card admin-device-card">
          <header className="admin-analytics-card-header">
            <div>
              <h2>기기 유형</h2>
              <p>기기별 시청 시간 비중</p>
            </div>
          </header>
          {data.devices.length === 0 ? (
            <EmptyMetric>
              재생 세션에서 기기 유형을 정규화하면 표시됩니다.
            </EmptyMetric>
          ) : (
            <ul>
              {data.devices.map((device, index) => {
                const Icon =
                  index === 0
                    ? Smartphone
                    : index === 1
                      ? Tv
                      : MonitorSmartphone
                return (
                  <li key={device.label}>
                    <span>
                      <Icon />
                      <b>{device.label}</b>
                    </span>
                    <i>
                      <b style={{ width: `${String(device.value)}%` }} />
                    </i>
                    <em>{device.value}%</em>
                  </li>
                )
              })}
            </ul>
          )}
        </article>

        <article className="admin-analytics-card admin-quality-card">
          <header className="admin-analytics-card-header">
            <div>
              <h2>재생 품질</h2>
              <p>시청 경험 건전성</p>
            </div>
          </header>
          <div className="admin-quality-score">
            <strong>98.7</strong>
            <span>품질 점수</span>
          </div>
          <dl>
            <div>
              <dt>재생 시작</dt>
              <dd>1.2초</dd>
            </div>
            <div>
              <dt>버퍼링 비율</dt>
              <dd>0.8%</dd>
            </div>
            <div>
              <dt>재생 오류</dt>
              <dd>0.12%</dd>
            </div>
            <div>
              <dt>1080p 이상</dt>
              <dd>64%</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="admin-analytics-card admin-video-table-card">
        <header className="admin-analytics-card-header">
          <div>
            <h2>영상별 성과</h2>
            <p>조회수뿐 아니라 시청 품질과 완주율로 비교합니다.</p>
          </div>
          <button type="button">
            <Film /> 전체 영상
          </button>
        </header>
        <div className="admin-table-wrap">
          <table className="admin-table admin-analytics-table">
            <thead>
              <tr>
                <th>영상</th>
                <th>조회수</th>
                <th>시청 시간</th>
                <th>평균 시청</th>
                <th>평균 시청률</th>
                <th>완주율</th>
              </tr>
            </thead>
            <tbody>
              {data.topVideos.map((video, index) => (
                <tr key={video.id}>
                  <td>
                    <span className="admin-video-rank">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="admin-video-thumb">
                      <Play />
                    </span>
                    <span>
                      <strong>{video.title}</strong>
                      <small>{video.seriesTitle}</small>
                    </span>
                  </td>
                  <td>
                    <strong>{compact(video.views)}</strong>
                  </td>
                  <td>{compact(video.watchHours)}시간</td>
                  <td>{duration(video.averageViewDurationSec)}</td>
                  <td>
                    {video.averageViewedPercent === null
                      ? '수집 필요'
                      : `${String(video.averageViewedPercent)}%`}
                  </td>
                  <td>
                    {video.completionRate === null ? (
                      '수집 필요'
                    ) : (
                      <span className="admin-completion">
                        <i>
                          <b
                            style={{
                              width: `${String(video.completionRate)}%`,
                            }}
                          />
                        </i>
                        {video.completionRate}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
