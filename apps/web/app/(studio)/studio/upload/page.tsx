import { ArrowLeft, CheckCircle2, Film, UploadCloud } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { requireCapability } from '@/src/auth/server-session'
import { StudioMediaLibrary } from '@/src/components/studio/StudioMediaLibrary'
import { Uploader } from '@/src/components/upload/Uploader'
import { getStudioMediaLibrary } from '@/src/services/studio/get-studio-dashboard'

export const metadata: Metadata = {
  title: '영상 업로드 · AIDREAM',
}

export default async function UploadPage(): Promise<ReactNode> {
  const session = await requireCapability('upload.create', '/studio/upload')
  const assets = await getStudioMediaLibrary(session)

  return (
    <main className="studio-task-page">
      <Link href="/studio" className="studio-back-link">
        <ArrowLeft aria-hidden="true" /> 대시보드로 돌아가기
      </Link>
      <header className="studio-page-header">
        <div>
          <span>MEDIA INGEST</span>
          <h1>영상 업로드</h1>
          <p>
            업로드가 끝나면 재생용 영상 변환이 자동으로 시작됩니다. 변환 중에는
            이 페이지를 닫아도 작업이 계속됩니다.
          </p>
        </div>
      </header>
      <div className="studio-upload-layout">
        <section className="studio-upload-card">
          <Uploader />
        </section>
        <aside className="studio-upload-guide">
          <span>WORKFLOW</span>
          <h2>업로드 이후</h2>
          <ol>
            <li>
              <UploadCloud aria-hidden="true" />
              <div>
                <strong>원본 업로드</strong>
                <small>브라우저에서 저장소로 안전하게 전송</small>
              </div>
            </li>
            <li>
              <Film aria-hidden="true" />
              <div>
                <strong>자동 변환</strong>
                <small>HLS 화질별 변환과 썸네일 생성</small>
              </div>
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>에피소드 연결</strong>
                <small>완료된 영상은 시리즈에서 바로 선택</small>
              </div>
            </li>
          </ol>
          <p>
            변환 완료 알림을 받은 뒤 시리즈 관리 화면에서 영상을 선택할 수
            있습니다.
          </p>
        </aside>
      </div>
      <section className="studio-media-section" id="library">
        <div className="studio-section-title-row">
          <div>
            <span>MEDIA LIBRARY</span>
            <h2>미디어 보관함</h2>
            <p>업로드·변환 상태와 에피소드 연결 여부를 확인합니다.</p>
          </div>
        </div>
        <StudioMediaLibrary assets={assets} />
      </section>
    </main>
  )
}
