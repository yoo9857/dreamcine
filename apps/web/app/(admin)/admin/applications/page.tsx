import { ClipboardCheck, ExternalLink, Search } from 'lucide-react'

import { requireCapability } from '@/src/auth/server-session'
import { ApplicationStatusAction } from '@/src/components/admin/AdminMutationActions'
import { AdminPagination } from '@/src/components/admin/AdminPagination'
import { listAdminCreatorApplications } from '@/src/services/moderation/admin-operations'

const statuses = [
  'SUBMITTED',
  'REVIEWING',
  'SHORTLISTED',
  'ACCEPTED',
  'REJECTED',
] as const

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; cursor?: string }>
}) {
  const session = await requireCapability('user.setRole', '/admin/applications')
  const params = await searchParams
  const query = params.q?.trim()
  const status = statuses.find((value) => value === params.status)
  const page = await listAdminCreatorApplications(session, {
    limit: 15,
    ...(query === undefined || query === '' ? {} : { query }),
    ...(status === undefined ? {} : { status }),
    ...(params.cursor === undefined ? {} : { cursor: params.cursor }),
  })
  return (
    <div className="admin-dashboard admin-management-page">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">
            <ClipboardCheck /> CREATOR PROGRAM
          </p>
          <h1>크리에이터 지원 심사</h1>
          <p>포트폴리오와 지원 동기를 검토하고 선발 단계를 관리하세요.</p>
        </div>
        <form className="admin-page-search" action="/admin/applications">
          <Search />
          <input
            name="q"
            defaultValue={query}
            placeholder="이름 또는 이메일 검색"
          />
          <button type="submit">검색</button>
        </form>
      </section>
      <nav className="admin-filter-tabs" aria-label="지원 상태 필터">
        <a
          className={status === undefined ? 'is-active' : undefined}
          href="/admin/applications"
        >
          전체
        </a>
        {statuses.map((value) => (
          <a
            key={value}
            className={status === value ? 'is-active' : undefined}
            href={`/admin/applications?status=${value}`}
          >
            {value}
          </a>
        ))}
      </nav>
      <section className="admin-panel admin-management-panel">
        <header className="admin-management-header">
          <div>
            <strong>지원서 목록</strong>
            <span>{page.items.length}건 표시 중</span>
          </div>
        </header>
        {page.items.length === 0 ? (
          <div className="admin-empty">
            <ClipboardCheck />
            <strong>조건에 맞는 지원서가 없습니다.</strong>
          </div>
        ) : (
          <ul className="admin-application-list">
            {page.items.map((item) => (
              <li key={item.id}>
                <div className="admin-application-heading">
                  <span className="admin-list-avatar">
                    {item.displayName.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{item.displayName}</strong>
                    <span>
                      {item.email} · {item.track}
                    </span>
                  </div>
                  <em>{item.status}</em>
                </div>
                <p>{item.pitch}</p>
                {item.experience === null ? null : (
                  <small>{item.experience}</small>
                )}
                <div className="admin-application-foot">
                  <a href={item.portfolioUrl} target="_blank" rel="noreferrer">
                    포트폴리오 <ExternalLink />
                  </a>
                  {item.socialUrl === null ? null : (
                    <a href={item.socialUrl} target="_blank" rel="noreferrer">
                      소셜 채널 <ExternalLink />
                    </a>
                  )}
                  <span>
                    {new Intl.DateTimeFormat('ko-KR').format(item.createdAt)}
                  </span>
                  <ApplicationStatusAction id={item.id} current={item.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <AdminPagination
          nextCursor={page.nextCursor}
          path="/admin/applications"
          params={{ q: query, status }}
        />
      </section>
    </div>
  )
}
