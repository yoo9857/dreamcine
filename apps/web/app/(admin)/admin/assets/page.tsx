import { HardDrive } from 'lucide-react'
import { getDataIntegritySnapshot } from '@aidream/db'

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
  const integrity = await getDataIntegritySnapshot()
  const page = await listAdminAssets(session, {
    limit: 20,
    ...(status ? { status } : {}),
    ...(params.cursor ? { cursor: params.cursor } : {}),
  })
  return (
    <div className="admin-dashboard admin-management-page">
      <section className="admin-panel">
        <h2>PostgreSQL 데이터 연결 점검</h2>
        <p>
          공개 영상의 준비된 에셋 누락 {integrity.publishedWithoutReadyAssets}건
          · 등록 이미지 {integrity.readyImages}건 · 유실 표시 이미지{' '}
          {integrity.missingImages}건 · 삭제 큐 전달 대기{' '}
          {integrity.pendingMedia}건
        </p>
        <p>
          정지 계정 {integrity.suspended}개 · 누적 경고 {integrity.warnings}건
        </p>
        <h3>업로드 완료 후 에셋 연결이 없는 기록 (최대 50건)</h3>
        {integrity.uploadedWithoutAssets.length === 0 ? (
          <p>누락 기록이 없습니다.</p>
        ) : (
          <ul>
            {integrity.uploadedWithoutAssets.map((upload) => (
              <li key={upload.id}>
                {upload.id} · 소유자 {upload.userId} ·{' '}
                {upload.updatedAt.toISOString()}
              </li>
            ))}
          </ul>
        )}
        <p>
          이 점검은 DB 연결을 확인합니다. 실제 저장소 파일 존재 여부는 별도
          저장소 점검으로 확인합니다.
        </p>
      </section>
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
