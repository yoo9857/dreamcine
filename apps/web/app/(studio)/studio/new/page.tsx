import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { requireCapability } from '@/src/auth/server-session'
import { WorkCreateFlow } from '@/src/components/studio/WorkCreateFlow'
import { listStudioSeries } from '@/src/services/series/get-studio-series'
import { getAvailableStudioAssets } from '@/src/services/studio/get-studio-dashboard'

export const metadata: Metadata = { title: '작품 등록 · ILOG' }

export default async function StudioCreatePage(): Promise<ReactNode> {
  const session = await requireCapability('series.create', '/studio/new')
  const [works, availableAssets] = await Promise.all([
    listStudioSeries(session),
    getAvailableStudioAssets(session),
  ])

  return (
    <main className="studio-task-page">
      <Link href="/studio" className="studio-back-link">
        <ArrowLeft aria-hidden="true" /> 대시보드로 돌아가기
      </Link>
      <header className="studio-page-header">
        <div>
          <span>CREATE</span>
          <h1>작품 등록</h1>
          <p>
            작품을 고르고, 영상을 올리고, 회차 정보를 채우는 세 단계로 끝납니다.
            업로드한 영상은 이 화면을 닫아도 변환이 계속됩니다.
          </p>
        </div>
      </header>
      <WorkCreateFlow works={works} availableAssets={availableAssets} />
    </main>
  )
}
