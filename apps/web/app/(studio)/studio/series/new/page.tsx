import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ArrowLeft, Info } from 'lucide-react'
import Link from 'next/link'

import { CreateSeriesForm } from '@/src/components/studio/CreateSeriesForm'

export const metadata: Metadata = { title: '새 작품 · ILOG' }

export default function NewSeriesPage(): ReactNode {
  return (
    <main className="studio-task-page">
      <Link href="/studio" className="studio-back-link">
        <ArrowLeft aria-hidden="true" /> 대시보드로 돌아가기
      </Link>
      <header className="studio-page-header">
        <div>
          <span>NEW WORK</span>
          <h1>새 작품 만들기</h1>
          <p>
            시리즈·영화·단편·숏폼·광고 CF까지 작품 형식을 먼저 정합니다. 영상은
            다음 화면에서 회차나 본편으로 연결합니다.
          </p>
        </div>
      </header>
      <div className="studio-form-layout">
        <section className="studio-form-card">
          <CreateSeriesForm />
        </section>
        <aside className="studio-form-guide">
          <Info aria-hidden="true" />
          <div>
            <strong>작품과 영상은 이렇게 구성됩니다</strong>
            <p>
              여기서는 최상위 작품을 만듭니다. 영상은 다음 화면에서 개별 회차나
              본편·버전으로 연결하며, 제목·순서·공개 상태·데이터를 따로
              관리합니다.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
