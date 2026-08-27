import { BadgeCheck, ChevronRight, Clock3, Search, Users } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const previewUsers = [
  {
    id: 'preview-1',
    name: '김민서',
    handle: 'minseo.film',
    email: 'minseo@example.com',
    role: 'CREATOR',
    status: 'ACTIVE',
    verified: true,
    activity: '작품 24 · 팔로워 1.8만',
    lastSeen: '12분 전',
    joined: '2025. 11. 18.',
  },
  {
    id: 'preview-2',
    name: '이준호',
    handle: 'juno',
    email: 'juno@example.com',
    role: 'VIEWER',
    status: 'ACTIVE',
    verified: true,
    activity: '작품 0 · 팔로워 128',
    lastSeen: '4시간 전',
    joined: '2026. 2. 4.',
  },
  {
    id: 'preview-3',
    name: '박유나',
    handle: 'yuna.archive',
    email: 'yuna@example.com',
    role: 'PARTNER',
    status: 'ACTIVE',
    verified: true,
    activity: '작품 61 · 팔로워 4.2만',
    lastSeen: '어제',
    joined: '2024. 8. 27.',
  },
  {
    id: 'preview-4',
    name: '최도윤',
    handle: 'doyoon.mov',
    email: 'doyoon@example.com',
    role: 'CREATOR',
    status: 'SUSPENDED',
    verified: false,
    activity: '작품 7 · 팔로워 854',
    lastSeen: '8일 전',
    joined: '2026. 6. 12.',
  },
  {
    id: 'preview-5',
    name: '정하린',
    handle: 'harin.scene',
    email: 'harin@example.com',
    role: 'VIEWER',
    status: 'ACTIVE',
    verified: false,
    activity: '작품 0 · 팔로워 42',
    lastSeen: '14일 전',
    joined: '2026. 8. 9.',
  },
] as const

export default function AdminUsersPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()

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
            <p>최근 가입순 · 현재 페이지 {previewUsers.length}명</p>
          </div>
          <form className="admin-page-search" action="/admin-preview/users">
            <Search />
            <input
              aria-label="회원 검색"
              placeholder="이름, 핸들 또는 이메일 검색"
            />
            <button type="submit">검색</button>
          </form>
        </header>

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
              {previewUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <span className="admin-table-avatar">
                      {user.name.slice(0, 1)}
                    </span>
                    <span>
                      <strong>{user.name}</strong>
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
                      <BadgeCheck /> {user.verified ? '이메일 인증' : '미인증'}
                    </span>
                  </td>
                  <td>
                    <span className="admin-activity-summary">
                      {user.activity}
                    </span>
                  </td>
                  <td>
                    <span className="admin-date-cell">
                      <Clock3 /> {user.lastSeen}
                    </span>
                  </td>
                  <td>{user.joined}</td>
                  <td>
                    <Link
                      className="admin-row-link"
                      href={`/admin-preview/users/${user.id}`}
                      aria-label={`${user.name} 회원 상세`}
                    >
                      <ChevronRight />
                    </Link>
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
