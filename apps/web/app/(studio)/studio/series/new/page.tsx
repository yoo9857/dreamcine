import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ArrowLeft, Info } from 'lucide-react'
import Link from 'next/link'

import { CreateSeriesForm } from '@/src/components/studio/CreateSeriesForm'

export const metadata: Metadata = { title: '새 시리즈 · AIDREAM' }

export default function NewSeriesPage(): ReactNode {
  return (
    <main className="studio-task-page">
      <Link href="/studio" className="studio-back-link">
        <ArrowLeft aria-hidden="true" /> 대시보드로 돌아가기
      </Link>
      <header className="studio-page-header">
        <div>
          <span>NEW SERIES</span>
          <h1>새 시리즈</h1>
          <p>
            작품의 기본 정보를 입력해 주세요. 생성 후 에피소드와 공개 상태를
            관리할 수 있습니다.
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
            <strong>좋은 작품 페이지를 만드는 방법</strong>
            <p>
              명확한 제목과 간결한 소개를 작성하세요. 포스터와 상세 메타데이터
              편집은 생성 후 관리 화면에서 이어집니다.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
