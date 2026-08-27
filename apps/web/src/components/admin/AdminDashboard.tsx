import type { AdminDashboardSnapshot } from '@aidream/db'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  Clock3,
  Filter,
  Flag,
  Search,
  TrendingUp,
  UserPlus,
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
  const periodUsers = data.growth.reduce((sum, item) => sum + item.users, 0)
  const maxGrowth = Math.max(...data.growth.map((item) => item.users), 1)
  const totalEpisodes = data.episodeStatus.reduce(
    (sum, item) => sum + item.count,
    0,
  )
  const publishedRate =
    totalEpisodes === 0
      ? 0
      : Math.round((data.totals.publishedEpisodes / totalEpisodes) * 100)
  const activeGoalBars = Math.round((publishedRate / 100) * 42)

  const cards = [
    {
      label: '전체 회원',
      value: compact(data.totals.users),
      previous: `${compact(Math.max(data.totals.users - periodUsers, 0))} 이전`,
      trend: percentChange(periodUsers, data.previousWeekUsers),
    },
    {
      label: '활성 크리에이터',
      value: compact(data.totals.creators),
      previous: 'Creator · Partner',
      trend: '운영 중',
    },
    {
      label: '게시된 에피소드',
      value: compact(data.totals.publishedEpisodes),
      previous: `전체 ${compact(totalEpisodes)}개`,
      trend: `${String(publishedRate)}%`,
    },
    {
      label: '누적 조회수',
      value: compact(data.totals.totalViews),
      previous: '전체 공개 콘텐츠',
      trend: '누적',
    },
  ]

  const queue = [
    {
      label: '미처리 신고',
      detail: '우선 검토',
      value: data.attention.openReports,
      icon: Flag,
      href: '/admin/reports?status=OPEN',
    },
    {
      label: '처리 중 영상',
      detail: '파이프라인',
      value: data.attention.processingAssets,
      icon: Clock3,
      href: '/admin/assets',
    },
    {
      label: '실패 에셋',
      detail: '재시도 필요',
      value: data.attention.failedAssets,
      icon: CircleAlert,
      href: '/admin/assets?status=FAILED',
    },
    {
      label: '크리에이터 지원',
      detail: '심사 대기',
      value: data.attention.creatorApplications,
      icon: UserPlus,
      href: '/admin/applications?status=SUBMITTED',
    },
  ]

  return (
    <div className="admin-dashboard admin-crm-dashboard">
      <section className="admin-crm-heading">
        <h1>운영 현황</h1>
        <p>회원, 콘텐츠, 신고와 미디어 처리 상태를 한눈에 확인하세요.</p>
      </section>

      <section className="admin-crm-kpis" aria-label="핵심 지표">
        {cards.map((card) => (
          <article className="admin-crm-kpi" key={card.label}>
            <header>
              <span>{card.label}</span>
              <ArrowUpRight />
            </header>
            <div className="admin-crm-kpi-value">
              <strong>{card.value}</strong>
              <em>
                <TrendingUp /> {card.trend}
              </em>
            </div>
            <p>
              <b>{card.previous.split(' ')[0]}</b>{' '}
              {card.previous.split(' ').slice(1).join(' ')}
            </p>
          </article>
        ))}
      </section>

      <section className="admin-crm-card admin-crm-flow">
        <header className="admin-crm-card-header">
          <h2>신규 회원 흐름</h2>
          <nav className="admin-crm-select" aria-label="조회 기간">
            <Link
              className={data.periodDays === 7 ? 'is-active' : undefined}
              href="/admin?range=7d"
            >
              최근 7일
            </Link>
            <Link
              className={data.periodDays === 30 ? 'is-active' : undefined}
              href="/admin?range=30d"
            >
              최근 30일
            </Link>
            <ChevronDown />
          </nav>
        </header>
        <div className="admin-crm-flow-content">
          <div
            className={`admin-crm-bars${data.periodDays === 30 ? ' is-long-range' : ''}`}
            role="img"
            aria-label={`최근 ${String(data.periodDays)}일 신규 회원 막대 차트`}
          >
            {data.growth.map((item) => {
              const height = Math.max((item.users / maxGrowth) * 100, 5)
              const label = new Intl.DateTimeFormat('ko-KR', {
                month: 'short',
                day: 'numeric',
              }).format(new Date(`${item.date}T12:00:00`))
              return (
                <div className="admin-crm-bar" key={item.date}>
                  <i style={{ height: `${String(height)}%` }} />
                  <small>{label}</small>
                </div>
              )
            })}
          </div>

          <aside className="admin-crm-flow-summary">
            <div>
              <strong>{periodUsers}</strong> <span>명</span>
              <p>선택한 기간에 새로 가입한 전체 회원입니다.</p>
            </div>
            <div className="admin-crm-conversion">
              <small>활성 크리에이터</small>
              <strong>
                {compact(data.totals.creators)} <span>명</span>
              </strong>
              <p>현재 활동 가능한 Creator와 Partner 계정입니다.</p>
              <i>
                <b
                  style={{
                    width: `${String(Math.min(100, publishedRate))}%`,
                  }}
                />
              </i>
              <footer>
                <b>{compact(data.totals.creators)} 활성</b>
                <span>{compact(data.totals.users)} 전체 회원</span>
              </footer>
            </div>
          </aside>
        </div>
      </section>

      <section className="admin-crm-split">
        <article className="admin-crm-card admin-crm-queue">
          <header className="admin-crm-card-header">
            <h2>운영 대기열</h2>
            <Link className="admin-crm-outline-button" href="/admin/reports">
              <CalendarDays /> 전체 작업 보기
            </Link>
          </header>
          <div className="admin-crm-queue-track">
            {queue.map((item) => {
              const Icon = item.icon
              return (
                <Link href={item.href} key={item.label}>
                  <span>{item.detail}</span>
                  <i>
                    <Icon />
                  </i>
                  <strong>{item.value}</strong>
                  <small>{item.label}</small>
                </Link>
              )
            })}
          </div>
        </article>

        <article className="admin-crm-card admin-crm-goal">
          <header className="admin-crm-card-header">
            <h2>콘텐츠 공개 비율</h2>
          </header>
          <div className="admin-crm-goal-copy">
            <strong>{compact(data.totals.publishedEpisodes)}</strong>
            <span>공개</span>
            <em>{compact(totalEpisodes)} 전체</em>
          </div>
          <div className="admin-crm-goal-bars" aria-hidden="true">
            {Array.from({ length: 42 }, (_, index) => (
              <i
                className={index < activeGoalBars ? 'is-active' : undefined}
                key={index}
              />
            ))}
          </div>
          <p>{String(publishedRate)}%의 에피소드가 현재 공개 상태입니다.</p>
        </article>
      </section>

      <section className="admin-crm-card admin-crm-table-card">
        <header className="admin-crm-table-heading">
          <div>
            <h2>최근 가입 회원</h2>
            <p>새로 유입된 회원의 계정 상태와 역할을 확인합니다.</p>
          </div>
          <div className="admin-crm-table-actions">
            <label>
              <Search />
              <input placeholder="회원 검색..." aria-label="회원 검색" />
            </label>
            <Link href="/admin/users">
              <Filter /> 전체 회원 <ChevronDown />
            </Link>
          </div>
        </header>
        <div className="admin-table-wrap">
          <table className="admin-table admin-crm-table">
            <thead>
              <tr>
                <th>회원</th>
                <th>핸들</th>
                <th>역할</th>
                <th>상태</th>
                <th>가입</th>
                <th aria-label="상세" />
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
                      <small>{user.email}</small>
                    </span>
                  </td>
                  <td>@{user.handle}</td>
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
                  <td>
                    <Link
                      href={`/admin/users/${user.id}`}
                      aria-label="회원 상세"
                    >
                      <ArrowRight />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="admin-crm-table-footer">
          <span>
            최근 회원 {data.recentUsers.length}명을 표시하고 있습니다.
          </span>
          <Link href="/admin/users">
            전체 회원 보기 <ArrowRight />
          </Link>
        </footer>
      </section>
    </div>
  )
}
