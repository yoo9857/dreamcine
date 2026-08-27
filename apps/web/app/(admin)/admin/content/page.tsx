import { Eye, Film, Search } from 'lucide-react'
import Link from 'next/link'

import { requireCapability } from '@/src/auth/server-session'
import { AdminPagination } from '@/src/components/admin/AdminPagination'
import { listAdminContent } from '@/src/services/moderation/admin-operations'

const statuses = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'HIDDEN',
  'REMOVED',
] as const

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; cursor?: string }>
}) {
  const session = await requireCapability('user.setRole', '/admin/content')
  const params = await searchParams
  const query = params.q?.trim()
  const status = statuses.find((value) => value === params.status)
  const page = await listAdminContent(session, {
    limit: 20,
    ...(query ? { query } : {}),
    ...(status ? { status } : {}),
    ...(params.cursor ? { cursor: params.cursor } : {}),
  })
  return (
    <div className="admin-dashboard admin-management-page">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">
            <Film /> CONTENT LIBRARY
          </p>
          <h1>콘텐츠 관리</h1>
          <p>전체 에피소드의 공개 상태와 미디어 준비 상태를 확인하세요.</p>
        </div>
        <form className="admin-page-search" action="/admin/content">
          <Search />
          <input
            name="q"
            defaultValue={query}
            placeholder="에피소드 또는 시리즈 검색"
          />
          <button type="submit">검색</button>
        </form>
      </section>
      <nav className="admin-filter-tabs">
        <a
          className={status === undefined ? 'is-active' : undefined}
          href="/admin/content"
        >
          전체
        </a>
        {statuses.map((value) => (
          <a
            key={value}
            className={status === value ? 'is-active' : undefined}
            href={`/admin/content?status=${value}`}
          >
            {value}
          </a>
        ))}
      </nav>
      <section className="admin-panel admin-management-panel">
        <header className="admin-management-header">
          <div>
            <strong>에피소드 라이브러리</strong>
            <span>{page.items.length}개 표시 중</span>
          </div>
        </header>
        <div className="admin-table-wrap">
          <table className="admin-table admin-data-table">
            <thead>
              <tr>
                <th>콘텐츠</th>
                <th>상태</th>
                <th>미디어</th>
                <th>조회</th>
                <th>좋아요</th>
                <th>등록일</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {page.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="admin-content-thumb">
                      <Film />
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.series.title} · @{item.series.owner.handle}
                      </small>
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-state-badge is-${item.status.toLowerCase()}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>{item.asset?.status ?? 'NO ASSET'}</td>
                  <td>
                    <Eye /> {Number(item.viewCount).toLocaleString('ko-KR')}
                  </td>
                  <td>{item.likeCount.toLocaleString('ko-KR')}</td>
                  <td>
                    {new Intl.DateTimeFormat('ko-KR').format(item.createdAt)}
                  </td>
                  <td>
                    <Link href={`/watch/${item.id}`}>보기</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination
          nextCursor={page.nextCursor}
          path="/admin/content"
          params={{ q: query, status }}
        />
      </section>
    </div>
  )
}
