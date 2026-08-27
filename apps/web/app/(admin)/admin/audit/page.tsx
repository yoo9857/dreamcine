import { History } from 'lucide-react'

import { requireCapability } from '@/src/auth/server-session'
import { listAdminRoleGrants } from '@/src/services/moderation/admin-operations'

export default async function AdminAuditPage() {
  const session = await requireCapability('user.setRole', '/admin/audit')
  const grants = await listAdminRoleGrants(session)
  return (
    <div className="admin-dashboard admin-management-page">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">
            <History /> SECURITY AUDIT
          </p>
          <h1>권한 변경 이력</h1>
          <p>관리자 역할 변경의 주체와 사유를 추적합니다.</p>
        </div>
      </section>
      <section className="admin-panel admin-management-panel">
        <header className="admin-management-header">
          <div>
            <strong>최근 역할 변경</strong>
            <span>최근 {grants.length}건</span>
          </div>
        </header>
        {grants.length === 0 ? (
          <div className="admin-empty">
            <History />
            <strong>역할 변경 기록이 없습니다.</strong>
          </div>
        ) : (
          <ul className="admin-audit-list">
            {grants.map((grant) => (
              <li key={grant.id}>
                <span className="admin-list-avatar">
                  <History />
                </span>
                <div>
                  <strong>@{grant.user.handle}</strong>
                  <span>
                    {grant.fromRole} → {grant.toRole}
                  </span>
                  <small>
                    {grant.reason ?? '사유 미기록'} · @
                    {grant.granter?.handle ?? 'system'}
                  </small>
                </div>
                <time>
                  {new Intl.DateTimeFormat('ko-KR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(grant.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
