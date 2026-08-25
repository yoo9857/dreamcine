import { can } from '@aidream/core'
import { Badge, Container, EmptyState, Stack } from '@aidream/ui'

import { requireCapability } from '@/src/auth/server-session'
import { ReportActions } from '@/src/components/moderation/ReportActions'
import { listReportQueue } from '@/src/services/moderation/list-report-queue'

export default async function AdminReportsPage() {
  const session = await requireCapability('report.review', '/admin/reports')
  const page = await listReportQueue(session, { limit: 20 })
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
    <main>
      <Container className="py-8">
        <Stack gap={6}>
          <div>
            <h1 className="text-2xl font-semibold">신고 심사</h1>
            <p className="text-sm text-fg-secondary">
              우선순위와 접수 시각에 따라 정렬됩니다.
            </p>
          </div>
          {page.items.length === 0 ? (
            <EmptyState title="처리할 신고가 없습니다" />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {page.items.map((report) => (
                <li
                  key={report.id}
                  className="flex items-start justify-between gap-4 p-4"
                >
                  <div>
                    <p className="font-medium">{report.preview.title}</p>
                    <p className="text-sm text-fg-secondary">{report.reason}</p>
                    <p className="text-sm text-fg-secondary">
                      @{report.preview.ownerHandle} · 누적{' '}
                      {report.preview.reportCount}건
                    </p>
                    {report.preview.body === null ? null : (
                      <p className="mt-2 line-clamp-2 text-sm text-fg-secondary">
                        {report.preview.body}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-fg-muted">
                      {Object.entries(report.preview.reasonCounts)
                        .map(([reason, count]) => `${reason} ${String(count)}`)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <Badge tone={report.priorityFlag ? 'warning' : 'neutral'}>
                      {report.priorityFlag ? '우선 심사' : report.status}
                    </Badge>
                    <ReportActions reportId={report.id} admin={admin} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Stack>
      </Container>
    </main>
  )
}
