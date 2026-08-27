import { BadgeCheck, ChevronRight, Clock3, Search, Users } from 'lucide-react'
import Link from 'next/link'

import { requireCapability } from '@/src/auth/server-session'
import { AdminPagination } from '@/src/components/admin/AdminPagination'
import { listAdminUsers } from '@/src/services/moderation/manage-users'

function relativeDate(date: Date | null): string {
  if (date === null) return '기록 없음'
  const diff = Math.max(0, Date.now() - date.getTime())
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${String(minutes)}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${String(hours)}시간 전`
  const days = Math.floor(hours / 24)
  return days < 30
    ? `${String(days)}일 전`
    : new Intl.DateTimeFormat('ko-KR').format(date)
}

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
          <p>회원의 활동과 권한을 살펴보고 필요한 운영 조치를 수행합니다.</p>
        </div>
      </section>

      <section className="admin-panel admin-directory-panel">
        <header className="admin-directory-header">
          <div>
            <h2>전체 회원</h2>
            <p>최근 가입순 · 현재 페이지 {page.items.length}명</p>
          </div>
          <form className="admin-page-search" action="/admin/users">
            <Search />
            <input
              name="q"
              defaultValue={query}
              aria-label="회원 검색"
              placeholder="이름, 핸들 또는 이메일 검색"
            />
            <button type="submit">검색</button>
          </form>
        </header>

        {page.items.length === 0 ? (
          <div className="admin-empty">
            <Users />
            <strong>조건에 맞는 회원이 없습니다.</strong>
            <span>다른 이름, 핸들 또는 이메일로 검색해 보세요.</span>
          </div>
        ) : (
          <div className="admin-table-wrap admin-directory-table-wrap">
            <table className="admin-table admin-directory-table">
              <thead>
                <tr>
                  <th>회원</th>
                  <th>역할</th>
                  <th>상태</th>
                  <th>인증</th>
                  <th>활동</th>
                  <th>최근 접속</th>
                  <th>가입일</th>
                  <th aria-label="상세" />
                </tr>
              </thead>
              <tbody>
                {page.items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="admin-table-avatar">
                        {user.displayName.slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        <strong>
                          {user.displayName}
                          {user.id === session.userId ? (
                            <em className="admin-you-badge">나</em>
                          ) : null}
                        </strong>
                        <small>
                          @{user.handle} · {user.email}
                        </small>
                      </span>
                    </td>
                    <td>
                      <span className="admin-role-badge">{user.role}</span>
                    </td>
                    <td>
                      <span
                        className={`admin-user-state is-${user.status.toLowerCase()}`}
                      >
                        <i
                          className={`admin-status-dot is-${user.status.toLowerCase()}`}
                        />
                        {user.status === 'ACTIVE' ? '정상' : '정지'}
                      </span>
                    </td>
                    <td>
                      <span className="admin-verification-state">
                        <BadgeCheck />
                        {user.emailVerified === null ? '미인증' : '이메일 인증'}
                      </span>
                    </td>
                    <td>
                      <span className="admin-activity-summary">
                        작품 {user.episodeCount.toLocaleString('ko-KR')} ·
                        팔로워 {user.followerCount.toLocaleString('ko-KR')}
                      </span>
                    </td>
                    <td>
                      <span className="admin-date-cell">
                        <Clock3 />{' '}
                        {relativeDate(user.lastSeenAt ?? user.lastLoginAt)}
                      </span>
                    </td>
                    <td>
                      {new Intl.DateTimeFormat('ko-KR').format(user.createdAt)}
                    </td>
                    <td>
                      <Link
                        className="admin-row-link"
                        href={`/admin/users/${user.id}`}
                        aria-label={`${user.displayName} 회원 상세`}
                      >
                        <ChevronRight />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
