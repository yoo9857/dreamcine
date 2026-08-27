import { can } from '@aidream/core'
import { Flag } from 'lucide-react'

import { requireCapability } from '@/src/auth/server-session'
import { AdminPagination } from '@/src/components/admin/AdminPagination'
import { ReportActions } from '@/src/components/moderation/ReportActions'
import { listReportQueue } from '@/src/services/moderation/list-report-queue'

const statuses = ['OPEN', 'REVIEWING', 'ACTIONED', 'REJECTED'] as const

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cursor?: string }>
}) {
  const session = await requireCapability('report.review', '/admin/reports')
  const params = await searchParams
  const status = statuses.find((value) => value === params.status)
  const page = await listReportQueue(session, {
    limit: 20,
    ...(status ? { status } : {}),
    ...(params.cursor ? { cursor: params.cursor } : {}),
  })
  const admin = can(
    {
      id: session.userId,
      role: session.user.role,
      status: session.user.status,
      emailVerified: session.user.emailVerified,
    },
    'user.suspend',
  )
  return (
    <div className="admin-dashboard admin-management-page">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">
            <Flag /> TRUST &amp; SAFETY
          </p>
          <h1>신고 센터</h1>
          <p>우선순위와 접수 시각에 따라 신고를 검토하세요.</p>
        </div>
      </section>
      <nav className="admin-filter-tabs">
        <a
          className={status === undefined ? 'is-active' : undefined}
          href="/admin/reports"
        >
          전체
        </a>
        {statuses.map((value) => (
          <a
            key={value}
            className={status === value ? 'is-active' : undefined}
            href={`/admin/reports?status=${value}`}
          >
            {value}
          </a>
        ))}
      </nav>
      <section className="admin-panel admin-management-panel">
        <header className="admin-management-header">
          <div>
            <strong>검토 대기열</strong>
            <span>{page.items.length}건 표시 중</span>
          </div>
        </header>
        {page.items.length === 0 ? (
          <div className="admin-empty">
            <Flag />
            <strong>처리할 신고가 없습니다.</strong>
            <span>현재 모든 신고가 검토되었습니다.</span>
          </div>
        ) : (
          <ul className="admin-management-list admin-report-list">
            {page.items.map((report) => (
              <li key={report.id}>
                <span className="admin-report-icon">
                  <Flag />
                </span>
                <div className="admin-list-identity">
                  <strong>{report.preview.title}</strong>
                  <span>
                    @{report.preview.ownerHandle} · 누적 신고{' '}
                    {report.preview.reportCount}건
                  </span>
                  {report.preview.body === null ? null : (
                    <small className="admin-report-body">
                      {report.preview.body}
                    </small>
                  )}
                  <small>
                    {Object.entries(report.preview.reasonCounts)
                      .map(([reason, count]) => `${reason} ${String(count)}`)
                      .join(' · ')}
                  </small>
                </div>
                <div className="admin-list-status">
                  <span
                    className={
                      report.priorityFlag
                        ? 'admin-priority-badge'
                        : 'admin-role-badge'
                    }
                  >
                    {report.priorityFlag ? '우선 검토' : report.status}
                  </span>
                  <ReportActions reportId={report.id} admin={admin} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <AdminPagination
          nextCursor={page.nextCursor}
          path="/admin/reports"
          params={{ status }}
        />
      </section>
    </div>
  )
}
