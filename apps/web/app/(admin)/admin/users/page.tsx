import { Search, Users } from 'lucide-react'

import { requireCapability } from '@/src/auth/server-session'
import { UserRoleAction } from '@/src/components/admin/AdminMutationActions'
import { AdminPagination } from '@/src/components/admin/AdminPagination'
import { UserStatusActions } from '@/src/components/moderation/UserStatusActions'
import { listAdminUsers } from '@/src/services/moderation/manage-users'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string }>
}) {
  const session = await requireCapability('user.suspend', '/admin/users')
  const { q, cursor } = await searchParams
  const query = q?.trim()
  const page = await listAdminUsers(session, {
    limit: 20,
    ...(query === undefined || query === '' ? {} : { query }),
    ...(cursor === undefined ? {} : { cursor }),
  })
  return (
    <div className="admin-dashboard admin-management-page">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">
            <Users /> COMMUNITY
          </p>
          <h1>회원 관리</h1>
          <p>계정 상태와 서비스 권한을 안전하게 관리하세요.</p>
        </div>
        <form className="admin-page-search" action="/admin/users">
          <Search />
          <input
            name="q"
            defaultValue={query}
            placeholder="이름, 핸들, 이메일 검색"
          />
          <button type="submit">검색</button>
        </form>
      </section>
      <section className="admin-panel admin-management-panel">
        <header className="admin-management-header">
          <div>
            <strong>회원 목록</strong>
            <span>{page.items.length}명 표시 중</span>
          </div>
        </header>
        {page.items.length === 0 ? (
          <div className="admin-empty">
            <Users />
            <strong>조건에 맞는 회원이 없습니다.</strong>
            <span>다른 검색어로 다시 시도해 보세요.</span>
          </div>
        ) : (
          <ul className="admin-management-list">
            {page.items.map((user) => (
              <li key={user.id}>
                <span className="admin-list-avatar">
                  {user.displayName.slice(0, 1).toUpperCase()}
                </span>
                <div className="admin-list-identity">
                  <strong>{user.displayName}</strong>
                  <span>
                    @{user.handle} · {user.email}
                  </span>
                  <small>
                    가입{' '}
                    {new Intl.DateTimeFormat('ko-KR').format(user.createdAt)}
                  </small>
                </div>
                <div className="admin-list-status">
                  <span>
                    <i
                      className={`admin-status-dot is-${user.status.toLowerCase()}`}
                    />
                    {user.status === 'ACTIVE' ? '정상' : '정지'}
                  </span>
                  {user.id === session.userId ? (
                    <small>현재 로그인한 관리자</small>
                  ) : (
                    <>
                      <UserStatusActions userId={user.id} />
                      <UserRoleAction userId={user.id} current={user.role} />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <AdminPagination
          nextCursor={page.nextCursor}
          path="/admin/users"
          params={{ q: query }}
        />
      </section>
    </div>
  )
}
