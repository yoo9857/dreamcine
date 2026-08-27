import { HardDrive } from 'lucide-react'

import { requireCapability } from '@/src/auth/server-session'
import { RetryAssetAction } from '@/src/components/admin/AdminMutationActions'
import { AdminPagination } from '@/src/components/admin/AdminPagination'
import { listAdminAssets } from '@/src/services/moderation/admin-operations'

const statuses = [
  'PENDING',
  'PROBING',
  'TRANSCODING',
  'READY',
  'FAILED',
] as const
const size = (value: string | null) =>
  value === null ? '—' : `${(Number(value) / 1024 / 1024).toFixed(1)} MB`

export default async function AdminAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cursor?: string }>
}) {
  const session = await requireCapability('user.setRole', '/admin/assets')
  const params = await searchParams
  const status = statuses.find((value) => value === params.status)
  const page = await listAdminAssets(session, {
    limit: 20,
    ...(status ? { status } : {}),
    ...(params.cursor ? { cursor: params.cursor } : {}),
  })
  return (
    <div className="admin-dashboard admin-management-page">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">
            <HardDrive /> MEDIA PIPELINE
          </p>
          <h1>영상 에셋</h1>
          <p>업로드부터 트랜스코딩 완료까지 미디어 파이프라인을 추적하세요.</p>
        </div>
      </section>
      <nav className="admin-filter-tabs">
        <a
          className={status === undefined ? 'is-active' : undefined}
          href="/admin/assets"
        >
          전체
        </a>
        {statuses.map((value) => (
          <a
            key={value}
            className={status === value ? 'is-active' : undefined}
            href={`/admin/assets?status=${value}`}
          >
            {value}
          </a>
        ))}
      </nav>
      <section className="admin-panel admin-management-panel">
        <header className="admin-management-header">
          <div>
            <strong>에셋 목록</strong>
            <span>{page.items.length}개 표시 중</span>
          </div>
        </header>
        <div className="admin-table-wrap">
          <table className="admin-table admin-data-table">
            <thead>
              <tr>
                <th>원본</th>
                <th>상태</th>
                <th>크기</th>
                <th>길이</th>
                <th>시도</th>
                <th>오류</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {page.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="admin-list-avatar">
                      <HardDrive />
                    </span>
                    <span>
                      <strong>{item.fileName}</strong>
                      <small>
                        @{item.ownerHandle}
                        {item.episodeTitle === null
                          ? ''
                          : ` · ${item.episodeTitle}`}
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
                  <td>{size(item.sizeBytes)}</td>
                  <td>
                    {item.durationSec === null
                      ? '—'
                      : `${String(item.durationSec)}s`}
                  </td>
                  <td>{item.attemptCount}</td>
                  <td title={item.errorDetail ?? ''}>
                    {item.errorCode ?? '—'}
                  </td>
                  <td>
                    <RetryAssetAction
                      id={item.id}
                      disabled={
                        item.status !== 'FAILED' || item.attemptCount >= 3
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination
          nextCursor={page.nextCursor}
          path="/admin/assets"
          params={{ status }}
        />
      </section>
    </div>
  )
}
