import { ArrowLeft, CheckCircle2, Film, UploadCloud } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { requireCapability } from '@/src/auth/server-session'
import { StudioMediaLibrary } from '@/src/components/studio/StudioMediaLibrary'
import { Uploader } from '@/src/components/upload/Uploader'
import { getStudioMediaLibrary } from '@/src/services/studio/get-studio-dashboard'

export const metadata: Metadata = {
  title: '미디어 보관함 · ILOG',
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
          <span>MEDIA LIBRARY</span>
          <h1>미디어 보관함</h1>
          <p>
            작품과 상관없이 원본 영상만 올려두는 곳입니다. 업로드가 끝나면
            변환이 자동으로 시작되고, 이 페이지를 닫아도 계속됩니다.
          </p>
          <p className="studio-page-note">
            작품을 공개하려면 <Link href="/studio/new">만들기</Link>에서
            작품·영상·회차를 한 번에 등록하세요.
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
                <strong>회차 연결</strong>
                <small>완료된 영상은 작품 등록에서 바로 선택</small>
              </div>
            </li>
          </ol>
          <p>
            변환이 끝난 영상은 <Link href="/studio/new">만들기</Link>의 회차
            정보 단계에서 바로 고를 수 있습니다.
          </p>
        </aside>
      </div>
      <section className="studio-media-section" id="library">
        <div className="studio-section-title-row">
          <div>
            <span>SOURCE FILES</span>
            <h2>업로드한 원본</h2>
            <p>업로드·변환 상태와 회차 연결 여부를 확인합니다.</p>
          </div>
        </div>
        <StudioMediaLibrary assets={assets} />
      </section>
    </main>
  )
}
