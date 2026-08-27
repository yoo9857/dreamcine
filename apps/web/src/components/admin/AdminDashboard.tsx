import type { AdminDashboardSnapshot } from '@aidream/db'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  FileVideo2,
  Flag,
  Play,
  Radio,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import Link from 'next/link'

function compact(value: number | string): string {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value))
}

function percentChange(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? '0%' : '+100%'
  const value = Math.round(((current - previous) / previous) * 100)
  return `${value >= 0 ? '+' : ''}${String(value)}%`
}

function relativeDate(date: Date): string {
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return '방금 전'
  if (hours < 24) return `${String(hours)}시간 전`
  const days = Math.floor(hours / 24)
  return `${String(days)}일 전`
}

export function AdminDashboard({ data }: { data: AdminDashboardSnapshot }) {
  const weekUsers = data.growth.reduce((sum, item) => sum + item.users, 0)
  const maxGrowth = Math.max(...data.growth.map((item) => item.users), 1)
  const totalEpisodes = data.episodeStatus.reduce(
    (sum, item) => sum + item.count,
    0,
  )
  const dateLabel = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())

  const cards = [
    {
      label: '전체 회원',
      value: compact(data.totals.users),
      detail: `이번 주 ${String(weekUsers)}명 가입`,
      trend: percentChange(weekUsers, data.previousWeekUsers),
      icon: Users,
      tone: 'violet',
    },
    {
      label: '활성 크리에이터',
      value: compact(data.totals.creators),
      detail: 'Creator · Partner',
      trend: 'ACTIVE',
      icon: Sparkles,
      tone: 'cyan',
    },
    {
      label: '게시된 에피소드',
      value: compact(data.totals.publishedEpisodes),
      detail: `전체 콘텐츠 ${String(totalEpisodes)}개`,
      trend: 'LIVE',
      icon: FileVideo2,
      tone: 'amber',
    },
    {
      label: '누적 조회수',
      value: compact(data.totals.totalViews),
      detail: '전체 공개 콘텐츠 기준',
      trend: 'ALL TIME',
      icon: Eye,
      tone: 'rose',
    },
  ]

  return (
    <div className="admin-dashboard">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">
            <Radio /> LIVE OPERATIONS
          </p>
          <h1>좋은 아침이에요.</h1>
          <p>{dateLabel} · ilog의 오늘을 한눈에 확인하세요.</p>
        </div>
        <div className="admin-heading-actions">
          <Link
            className="admin-button admin-button-secondary"
            href="/admin/reports"
          >
            <Flag /> 신고 검토
          </Link>
          <Link className="admin-button admin-button-primary" href="/studio">
            <Play /> 콘텐츠 등록
          </Link>
        </div>
      </section>

      <section className="admin-stat-grid" aria-label="핵심 지표">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <article className="admin-stat-card" key={card.label}>
              <div className={`admin-stat-icon is-${card.tone}`}>
                <Icon />
              </div>
              <div className="admin-stat-meta">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
              <div className="admin-stat-foot">
                <span>{card.detail}</span>
                <em>
                  <TrendingUp /> {card.trend}
                </em>
              </div>
            </article>
          )
        })}
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-panel admin-growth-panel">
          <header className="admin-panel-heading">
            <div>
              <span>GROWTH</span>
              <h2>신규 회원 추이</h2>
              <p>최근 7일간 일별 가입자</p>
            </div>
            <nav className="admin-range-switch">
              <Link
                className={data.periodDays === 7 ? 'is-active' : undefined}
                href="/admin?range=7d"
              >
                7일
              </Link>
              <Link
                className={data.periodDays === 30 ? 'is-active' : undefined}
                href="/admin?range=30d"
              >
                30일
              </Link>
            </nav>
          </header>
          <div className="admin-chart-summary">
            <strong>{String(weekUsers)}</strong>
            <span>최근 {data.periodDays}일 신규 회원</span>
            <em>
              {percentChange(weekUsers, data.previousWeekUsers)} vs 지난주
            </em>
          </div>
          <div
            className={`admin-bar-chart${data.periodDays === 30 ? ' is-long-range' : ''}`}
            role="img"
            aria-label={`최근 ${String(data.periodDays)}일 신규 회원 막대 차트`}
          >
            {data.growth.map((item, index) => {
              const height = Math.max((item.users / maxGrowth) * 100, 5)
              const label = new Intl.DateTimeFormat('ko-KR', {
                weekday: 'short',
              }).format(new Date(`${item.date}T12:00:00`))
              return (
                <div className="admin-bar-column" key={item.date}>
                  <span className="admin-bar-value">{item.users}</span>
                  <i
                    style={{ height: `${String(height)}%` }}
                    className={
                      index === data.growth.length - 1 ? 'is-today' : undefined
                    }
                  />
                  <small>{label}</small>
                </div>
              )
            })}
          </div>
        </article>

        <article className="admin-panel admin-attention-panel">
          <header className="admin-panel-heading">
            <div>
              <span>ATTENTION</span>
              <h2>운영 체크리스트</h2>
              <p>조치가 필요한 항목입니다.</p>
            </div>
          </header>
          <div className="admin-attention-list">
            <Link href="/admin/reports?status=OPEN">
              <span className="is-danger">
                <Flag />
              </span>
              <div>
                <strong>미처리 신고</strong>
                <small>우선순위에 따라 검토하세요</small>
              </div>
              <b>{data.attention.openReports}</b>
              <ArrowRight />
            </Link>
            <Link href="/admin/assets">
              <span className="is-info">
                <Clock3 />
              </span>
              <div>
                <strong>처리 중인 영상</strong>
                <small>인코딩 파이프라인 동작 중</small>
              </div>
              <b>{data.attention.processingAssets}</b>
              <ArrowRight />
            </Link>
            <Link href="/admin/assets?status=FAILED">
              <span className="is-warning">
                <FileVideo2 />
              </span>
              <div>
                <strong>트랜스코딩 실패</strong>
                <small>재처리가 필요한 에셋</small>
              </div>
              <b>{data.attention.failedAssets}</b>
              <ArrowRight />
            </Link>
            <Link href="/admin/applications?status=SUBMITTED">
              <span className="is-success">
                <UserPlus />
              </span>
              <div>
                <strong>크리에이터 지원</strong>
                <small>신규 지원서 검토 대기</small>
              </div>
              <b>{data.attention.creatorApplications}</b>
              <ArrowRight />
            </Link>
          </div>
        </article>

        <article className="admin-panel admin-users-panel">
          <header className="admin-panel-heading admin-panel-heading-inline">
            <div>
              <span>COMMUNITY</span>
              <h2>최근 가입 회원</h2>
            </div>
            <Link href="/admin/users">
              전체 보기 <ArrowRight />
            </Link>
          </header>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>회원</th>
                  <th>권한</th>
                  <th>상태</th>
                  <th>가입</th>
                </tr>
              </thead>
              <tbody>
                {data.recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="admin-table-avatar">
                        {user.displayName.slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        <strong>{user.displayName}</strong>
                        <small>@{user.handle}</small>
                      </span>
                    </td>
                    <td>
                      <span className="admin-role-badge">{user.role}</span>
                    </td>
                    <td>
                      <span
                        className={`admin-status-dot is-${user.status.toLowerCase()}`}
                      />
                      {user.status === 'ACTIVE' ? '정상' : '정지'}
                    </td>
                    <td>{relativeDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-panel admin-content-panel">
          <header className="admin-panel-heading admin-panel-heading-inline">
            <div>
              <span>CONTENT</span>
              <h2>인기 콘텐츠</h2>
            </div>
            <Link href="/browse">
              서비스에서 보기 <ArrowRight />
            </Link>
          </header>
          <div className="admin-top-content">
            {data.topEpisodes.length === 0 ? (
              <div className="admin-empty">
                <CheckCircle2 />
                <strong>아직 게시된 콘텐츠가 없습니다.</strong>
                <span>첫 작품이 등록되면 이곳에 표시됩니다.</span>
              </div>
            ) : (
              data.topEpisodes.map((episode, index) => (
                <div key={episode.id}>
                  <span className="admin-content-rank">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="admin-content-thumb">
                    <Play />
                  </span>
                  <span className="admin-content-copy">
                    <strong>{episode.title}</strong>
                    <small>{episode.seriesTitle}</small>
                  </span>
                  <span className="admin-content-metric">
                    <Eye /> {compact(episode.viewCount)}
                    <small>{compact(episode.likeCount)} likes</small>
                  </span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  )
}
